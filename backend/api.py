from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "pod_status.db"))

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
    pods = [
        {
            "cluster": row[0],
            "namespace": row[1],
            "name": row[2],
            "status": row[3],
            "restarts": row[4],
            "timestamp": row[5],
        }
        for row in rows
    ]
    return jsonify(pods)

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
