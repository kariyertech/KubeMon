from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime, timedelta
from cluster_config import should_include_namespace

app = Flask(__name__)
CORS(app, origins=["*"], methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "pod_status.db"))

# Import Event Analyzer service
try:
    from ai_service import event_analyzer
    AI_ENABLED = True
    print("[API][INFO] Event Analyzer service loaded successfully")
except ImportError as e:
    print(f"[API][WARNING] Event Analyzer not available: {e}")
    AI_ENABLED = False

@app.route("/api/pods", methods=["GET"])
def get_pods():
    cluster = request.args.get("cluster")
    hours = request.args.get("hours", default=24, type=int)
    threshold = (datetime.utcnow() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        if cluster:
            c.execute("SELECT cluster, namespace, pod_name, status, restarts, timestamp FROM pod_status WHERE cluster = ? AND timestamp >= ? AND (restarts > 0 OR status = ?) ORDER BY timestamp DESC", (cluster, threshold, "CrashLoopBackOff"))
        else:
            c.execute("SELECT cluster, namespace, pod_name, status, restarts, timestamp FROM pod_status WHERE timestamp >= ? AND (restarts > 0 OR status = ?) ORDER BY timestamp DESC", (threshold, "CrashLoopBackOff"))
        rows = c.fetchall()
    
    # Namespace filtering uygula
    filtered_pods = []
    for row in rows:
        cluster_name = row[0]
        namespace = row[1]
        
        # Bu namespace'i göster mi?
        if should_include_namespace(cluster_name, namespace):
            filtered_pods.append({
                "cluster": row[0],
                "namespace": row[1],
                "name": row[2],
                "status": row[3],
                "restarts": row[4],
                "timestamp": row[5],
            })
    
    print(f"[API] Pods: {len(rows)} total -> {len(filtered_pods)} filtered for cluster {cluster}")
    return jsonify(filtered_pods)

@app.route("/api/clusters", methods=["GET"])
def get_clusters():
    cluster_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "clusters"))
    clusters = []
    for file in os.listdir(cluster_dir):
        if file.startswith("admin-") and file.endswith(".conf"):
            name = file.replace("admin-", "").replace(".conf", "").lower()
            clusters.append({"label": name.capitalize(), "value": name})
    clusters = sorted(clusters, key=lambda x: x["label"])
    return jsonify(clusters)

@app.route("/api/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "ok", "port": 8000, "timestamp": datetime.utcnow().isoformat()}), 200

@app.route("/healthz", methods=["GET"])
def healthz_simple():
    return jsonify({"status": "ok"}), 200

@app.route("/api/events", methods=["GET"])
def get_events_api():
    cluster = request.args.get("cluster")
    event_category = request.args.get("type")  # Now using category instead of just type
    hours = request.args.get("hours", default=24, type=int)
    limit = request.args.get("limit", default=100, type=int)
    
    print(f"[API] Events request - cluster: {cluster}, category: {event_category}, hours: {hours}")
    
    try:
        from database import get_events_by_category
        events = get_events_by_category(cluster=cluster, category=event_category, hours=hours, limit=limit)
        
        # Namespace filtering uygula
        filtered_events = []
        for event in events:
            if should_include_namespace(event.get('cluster'), event.get('namespace')):
                filtered_events.append(event)
        
        print(f"[API] Events: {len(events)} total -> {len(filtered_events)} filtered for cluster {cluster}")
        return jsonify(filtered_events)
    except Exception as e:
        print(f"[API][ERROR] Failed to get events: {e}")
        return jsonify({"error": "Failed to fetch events"}), 500

@app.route("/api/alerts", methods=["GET"])
def get_alerts_api():
    cluster = request.args.get("cluster")
    status = request.args.get("status")
    severity = request.args.get("severity")
    hours = request.args.get("hours", default=168, type=int)  # Default 7 days
    limit = request.args.get("limit", default=100, type=int)
    
    print(f"[API] Alerts request - cluster: {cluster}, status: {status}, severity: {severity}, hours: {hours}")
    
    try:
        from database import get_alerts
        alerts = get_alerts(cluster=cluster, status=status, severity=severity, hours=hours, limit=limit)
        
        # Namespace filtering uygula (alert mesajlarındaki pod bilgilerini kontrol et)
        filtered_alerts = []
        for alert in alerts:
            # Alert'in cluster'ı filtre ile eşleşmiyorsa skip et
            if cluster and cluster != 'all' and alert.get('cluster') != cluster:
                continue
                
            # Alert mesajından namespace bilgisini çıkarmaya çalış
            alert_message = alert.get('message', '')
            alert_cluster = alert.get('cluster', '')
            
            # Pod: namespace/podname formatındaki mesajları kontrol et
            if 'Pod ' in alert_message and '/' in alert_message:
                try:
                    # "Pod namespace/podname:" formatını parse et
                    pod_part = alert_message.split('Pod ')[1].split(':')[0]
                    if '/' in pod_part:
                        namespace = pod_part.split('/')[0]
                        if should_include_namespace(alert_cluster, namespace):
                            filtered_alerts.append(alert)
                        else:
                            continue
                    else:
                        # Namespace parse edilemezse alert'i ekle
                        filtered_alerts.append(alert)
                except:
                    # Parse hatası varsa alert'i ekle
                    filtered_alerts.append(alert)
            else:
                # Pod mesajı değilse alert'i ekle
                filtered_alerts.append(alert)
        
        print(f"[API] Alerts: {len(alerts)} total -> {len(filtered_alerts)} filtered for cluster {cluster}")
        return jsonify(filtered_alerts)
    except Exception as e:
        print(f"[API][ERROR] Failed to get alerts: {e}")
        return jsonify({"error": "Failed to fetch alerts"}), 500

@app.route("/api/alerts/<int:alert_id>/resolve", methods=["POST"])
def resolve_alert_api(alert_id):
    try:
        from database import resolve_alert
        if resolve_alert(alert_id):
            return jsonify({"message": "Alert resolved successfully"}), 200
        else:
            return jsonify({"error": "Alert not found or already resolved"}), 404
    except Exception as e:
        print(f"[API][ERROR] Failed to resolve alert {alert_id}: {e}")
        return jsonify({"error": "Failed to resolve alert"}), 500

@app.route("/api/alerts/stats", methods=["GET"])
def get_alert_stats():
    try:
        from database import get_alerts
        
        # Get active alerts
        active_alerts = get_alerts(status='active', hours=168)
        
        # Count by severity
        critical_count = len([a for a in active_alerts if a['severity'] == 'critical'])
        warning_count = len([a for a in active_alerts if a['severity'] == 'warning'])
        info_count = len([a for a in active_alerts if a['severity'] == 'info'])
        
        stats = {
            'total_active': len(active_alerts),
            'critical': critical_count,
            'warning': warning_count,
            'info': info_count,
            'clusters': len(set([a['cluster'] for a in active_alerts]))
        }
        
        return jsonify(stats)
    except Exception as e:
        print(f"[API][ERROR] Failed to get alert stats: {e}")
        return jsonify({"error": "Failed to fetch alert statistics"}), 500

# Event AI Analyzer Endpoints
@app.route("/api/events/analyze", methods=["POST"])
def analyze_events():
    """Analyze events with AI for a specific cluster"""
    if not AI_ENABLED or not event_analyzer.is_enabled():
        return jsonify({"error": "Event Analyzer not available"}), 503
    data = request.get_json()
    if not data or 'cluster' not in data:
        return jsonify({"error": "Cluster parameter is required"}), 400
    cluster = data['cluster']
    hours = data.get('hours', 24)  # Default to last 24 hours
    try:
        import asyncio
        analysis = asyncio.run(event_analyzer.analyze_cluster_events(cluster, hours))
        return jsonify(analysis)
    except Exception as e:
        print(f"[API][ERROR] Event analysis failed: {e}")
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

@app.route("/api/events/ai-status", methods=["GET"])
def events_ai_status():
    """Check Event Analyzer availability"""
    if not AI_ENABLED:
        return jsonify({"available": False, "reason": "Event Analyzer not loaded"}), 503
    
    is_enabled = event_analyzer.is_enabled()
    return jsonify({
        "available": is_enabled,
        "reason": "OpenAI API key missing" if not is_enabled else "Ready",
        "service": "OpenAI GPT-4 Event Analyzer"
    })

if __name__ == "__main__":
    print(f"[API] Starting Flask API on 0.0.0.0:8000")
    app.run(host="0.0.0.0", port=8000, debug=False)
