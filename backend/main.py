import os
import time
from database import init_db, cleanup_old_data
from kube_client import load_and_process_cluster

print("[MAIN] KubeMon monitoring loop starting...")

def main_loop():
    print("[MAIN] Starting main monitoring cycle...")
    cluster_dir = "clusters"
    
    if not os.path.exists(cluster_dir):
        print(f"[MAIN][ERROR] Cluster directory {cluster_dir} not found")
        return
    
    # Process each cluster
    for file in os.listdir(cluster_dir):
        if file.endswith(".conf"):
            cluster_name = file.replace("admin-", "").replace(".conf", "").lower()
            path = os.path.join(cluster_dir, file)
            print(f"[MAIN] Processing cluster: {cluster_name}")
            
            try:
                # Collect pod status (existing functionality)
                load_and_process_cluster(path, cluster_name)
                
                # Collect events (new functionality)
                from events import collect_events_from_cluster
                collect_events_from_cluster(path, cluster_name)
                
            except Exception as e:
                print(f"[MAIN][ERROR] Error processing cluster {cluster_name}: {e}")
    
    # Run alert checks
    try:
        print("[MAIN] Running alert checks...")
        from alerts import run_alert_checks
        run_alert_checks()
    except Exception as e:
        print(f"[MAIN][ERROR] Alert check failed: {e}")
    
    # Cleanup old data
    try:
        cleanup_old_data()
        cleanup_old_events()
        print("[MAIN] Data cleanup completed")
    except Exception as e:
        print(f"[MAIN][ERROR] Data cleanup failed: {e}")

def cleanup_old_events(hours=168):  # Keep events for 7 days
    """Clean up old events and resolved alerts"""
    from datetime import datetime, timedelta
    import sqlite3
    from database import DB_PATH
    
    threshold = datetime.utcnow() - timedelta(hours=hours)
    
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        
        # Clean old events
        c.execute("DELETE FROM events WHERE timestamp < ?", (threshold,))
        events_deleted = c.rowcount
        
        # Clean old resolved alerts (keep for 30 days)
        alert_threshold = datetime.utcnow() - timedelta(days=30)
        c.execute("DELETE FROM alerts WHERE status = 'resolved' AND resolved_at < ?", (alert_threshold,))
        alerts_deleted = c.rowcount
        
        conn.commit()
        
    if events_deleted > 0 or alerts_deleted > 0:
        print(f"[MAIN] Cleaned up {events_deleted} old events and {alerts_deleted} old alerts")

if __name__ == "__main__":
    print("[MAIN] Initializing database...")
    init_db()
    
    print("[MAIN] Starting monitoring loop...")
    cycle_count = 0
    
    while True:
        cycle_count += 1
        print(f"[MAIN] === Monitoring Cycle {cycle_count} ===")
        
        try:
            main_loop()
            print(f"[MAIN] Cycle {cycle_count} completed successfully")
        except Exception as e:
            print(f"[MAIN][ERROR] Cycle {cycle_count} failed: {e}")
        
        print("[MAIN] Waiting 5 minutes for next cycle...")
        time.sleep(300)  # Poll every 5 minutes
