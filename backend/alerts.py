import sqlite3
import os
from datetime import datetime, timedelta
from database import save_alert, get_alerts, DB_PATH

# Alert rules configuration
ALERT_RULES = {
    'pod_restart_high': {
        'name': 'High Pod Restart Count',
        'description': 'Pod has restarted more than 5 times in 1 hour',
        'severity': 'warning',
        'threshold': 5,
        'duration_minutes': 60
    },
    'pod_crashloop': {
        'name': 'Pod CrashLoopBackOff',
        'description': 'Pod is in CrashLoopBackOff state',
        'severity': 'critical',
        'threshold': 1,
        'duration_minutes': 5
    },
    'pod_pending_long': {
        'name': 'Pod Pending Too Long',
        'description': 'Pod has been in Pending state for more than 10 minutes',
        'severity': 'warning',
        'threshold': 1,
        'duration_minutes': 10
    },
    'pod_image_pull_failed': {
        'name': 'Image Pull Failed',
        'description': 'Pod failed to pull container image',
        'severity': 'critical',
        'threshold': 1,
        'duration_minutes': 5
    }
}

def check_pod_restart_alerts():
    """Check for pods with high restart counts"""
    print("[ALERTS] Checking pod restart alerts...")
    
    threshold_time = datetime.utcnow() - timedelta(hours=1)
    
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
        SELECT cluster, namespace, pod_name, MAX(restarts) as max_restarts
        FROM pod_status 
        WHERE timestamp >= ? AND restarts >= ?
        GROUP BY cluster, namespace, pod_name
        HAVING max_restarts >= ?
        """, (threshold_time, 5, 5))
        
        pods = c.fetchall()
        
    for pod in pods:
        cluster, namespace, pod_name, restart_count = pod
        
        # Check if alert already exists for this pod
        if not alert_exists(cluster, 'pod_restart_high', f"{namespace}/{pod_name}"):
            message = f"Pod {namespace}/{pod_name} has restarted {restart_count} times in the last hour"
            alert_id = save_alert(cluster, 'pod_restart_high', 'warning', message, 
                                f"pod={namespace}/{pod_name},restarts={restart_count}")
            print(f"[ALERTS] Created restart alert for {cluster}/{namespace}/{pod_name}: {restart_count} restarts")

def check_crashloop_alerts():
    """Check for pods in CrashLoopBackOff state"""
    print("[ALERTS] Checking CrashLoopBackOff alerts...")
    
    threshold_time = datetime.utcnow() - timedelta(minutes=5)
    
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
        SELECT DISTINCT cluster, namespace, pod_name
        FROM pod_status 
        WHERE timestamp >= ? AND status = 'CrashLoopBackOff'
        """, (threshold_time,))
        
        pods = c.fetchall()
        
    for pod in pods:
        cluster, namespace, pod_name = pod
        
        if not alert_exists(cluster, 'pod_crashloop', f"{namespace}/{pod_name}"):
            message = f"Pod {namespace}/{pod_name} is in CrashLoopBackOff state"
            alert_id = save_alert(cluster, 'pod_crashloop', 'critical', message,
                                f"pod={namespace}/{pod_name}")
            print(f"[ALERTS] Created CrashLoopBackOff alert for {cluster}/{namespace}/{pod_name}")

def check_event_based_alerts():
    """Check for alerts based on recent events"""
    print("[ALERTS] Checking event-based alerts...")
    
    threshold_time = datetime.utcnow() - timedelta(minutes=10)
    
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        # Check for failed events
        c.execute("""
        SELECT cluster, namespace, object_name, reason, message, COUNT(*) as event_count
        FROM events 
        WHERE timestamp >= ? AND (reason LIKE '%Failed%' OR reason LIKE '%Error%' OR reason = 'ImagePullBackOff')
        GROUP BY cluster, namespace, object_name, reason
        """, (threshold_time,))
        
        events = c.fetchall()
        
    for event in events:
        cluster, namespace, object_name, reason, message, count = event
        
        rule_name = 'pod_image_pull_failed' if 'ImagePull' in reason else 'pod_failed_event'
        severity = 'critical' if 'ImagePull' in reason or 'Failed' in reason else 'warning'
        
        if not alert_exists(cluster, rule_name, f"{namespace}/{object_name}"):
            alert_message = f"Pod {namespace}/{object_name}: {reason} - {message}"
            if count > 1:
                alert_message += f" (occurred {count} times)"
                
            alert_id = save_alert(cluster, rule_name, severity, alert_message,
                                f"pod={namespace}/{object_name},reason={reason}")
            print(f"[ALERTS] Created event-based alert for {cluster}/{namespace}/{object_name}: {reason}")

def alert_exists(cluster, rule_name, object_identifier):
    """Check if an active alert already exists for the same issue"""
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
        SELECT id FROM alerts 
        WHERE cluster = ? AND rule_name = ? AND message LIKE ? AND status = 'active'
        AND created_at >= ?
        """, (cluster, rule_name, f"%{object_identifier}%", datetime.utcnow() - timedelta(hours=1)))
        
        return c.fetchone() is not None

def auto_resolve_alerts():
    """Auto-resolve alerts when conditions are no longer met"""
    print("[ALERTS] Checking for alerts to auto-resolve...")
    
    # Get active alerts
    active_alerts = get_alerts(status='active', hours=168)
    
    for alert in active_alerts:
        should_resolve = False
        
        # Check if pod restart alert should be resolved
        if alert['rule_name'] == 'pod_restart_high':
            should_resolve = check_pod_restart_resolved(alert)
        elif alert['rule_name'] == 'pod_crashloop':
            should_resolve = check_crashloop_resolved(alert)
            
        if should_resolve:
            from database import resolve_alert
            if resolve_alert(alert['id']):
                print(f"[ALERTS] Auto-resolved alert {alert['id']}: {alert['rule_name']}")

def check_pod_restart_resolved(alert):
    """Check if pod restart alert should be resolved"""
    # Extract pod info from alert message
    if "Pod " in alert['message']:
        try:
            # Simple parsing - in production would use metadata field
            pod_info = alert['message'].split("Pod ")[1].split(" has restarted")[0]
            namespace, pod_name = pod_info.split("/")
            
            # Check if pod has been stable for 30 minutes
            threshold_time = datetime.utcnow() - timedelta(minutes=30)
            
            with sqlite3.connect(DB_PATH) as conn:
                c = conn.cursor()
                c.execute("""
                SELECT COUNT(*) FROM pod_status 
                WHERE cluster = ? AND namespace = ? AND pod_name = ? 
                AND timestamp >= ? AND restarts > 0
                """, (alert['cluster'], namespace, pod_name, threshold_time))
                
                recent_restarts = c.fetchone()[0]
                return recent_restarts == 0
        except:
            return False
    return False

def check_crashloop_resolved(alert):
    """Check if CrashLoopBackOff alert should be resolved"""
    if "Pod " in alert['message']:
        try:
            pod_info = alert['message'].split("Pod ")[1].split(" is in CrashLoopBackOff")[0]
            namespace, pod_name = pod_info.split("/")
            
            # Check if pod is no longer in CrashLoopBackOff state
            threshold_time = datetime.utcnow() - timedelta(minutes=15)
            
            with sqlite3.connect(DB_PATH) as conn:
                c = conn.cursor()
                c.execute("""
                SELECT status FROM pod_status 
                WHERE cluster = ? AND namespace = ? AND pod_name = ? 
                AND timestamp >= ?
                ORDER BY timestamp DESC LIMIT 1
                """, (alert['cluster'], namespace, pod_name, threshold_time))
                
                result = c.fetchone()
                if result:
                    return result[0] != 'CrashLoopBackOff'
        except:
            return False
    return False

def run_alert_checks():
    """Run all alert checks"""
    print("[ALERTS] Starting alert check cycle...")
    
    try:
        check_pod_restart_alerts()
        check_crashloop_alerts() 
        check_event_based_alerts()
        auto_resolve_alerts()
        
        print("[ALERTS] Alert check cycle completed")
        
    except Exception as e:
        print(f"[ALERTS][ERROR] Alert check failed: {e}")

if __name__ == "__main__":
    run_alert_checks()
