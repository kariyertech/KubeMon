
import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join("data", "pod_status.db")

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
        CREATE TABLE IF NOT EXISTS pod_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cluster TEXT,
            namespace TEXT,
            pod_name TEXT,
            status TEXT,
            restarts INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        conn.commit()

def save_pod_status(cluster, namespace, pod_name, status, restarts):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
        INSERT INTO pod_status (cluster, namespace, pod_name, status, restarts, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (cluster, namespace, pod_name, status, restarts, datetime.utcnow()))
        conn.commit()

def cleanup_old_data(hours=24):
    threshold = datetime.utcnow() - timedelta(hours=hours)
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("DELETE FROM pod_status WHERE timestamp < ?", (threshold,))
        conn.commit()
