import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join("data", "pod_status.db")

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        # Pod status table (existing)
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
        
        # Events table (new)
        c.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cluster TEXT,
            namespace TEXT,
            object_name TEXT,
            object_kind TEXT,
            event_type TEXT,
            reason TEXT,
            message TEXT,
            count INTEGER DEFAULT 1,
            first_timestamp DATETIME,
            last_timestamp DATETIME,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Alerts table (new)
        c.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cluster TEXT,
            rule_name TEXT,
            severity TEXT,
            message TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME NULL,
            metadata TEXT NULL
        )
        """)
        
        # Alert rules table (new)
        c.execute("""
        CREATE TABLE IF NOT EXISTS alert_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            description TEXT,
            condition_type TEXT,
            threshold_value REAL,
            threshold_duration INTEGER,
            severity TEXT,
            enabled BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        conn.commit()
        print("[DB] Database tables initialized successfully")

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

# Events functions
def save_event(cluster, namespace, object_name, object_kind, event_type, reason, message, first_timestamp, last_timestamp, count=1):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        # Check if similar event exists recently (deduplication)
        c.execute("""
        SELECT id, count FROM events 
        WHERE cluster = ? AND namespace = ? AND object_name = ? AND reason = ? 
        AND timestamp > ? 
        ORDER BY timestamp DESC LIMIT 1
        """, (cluster, namespace, object_name, reason, datetime.utcnow() - timedelta(minutes=5)))
        
        existing = c.fetchone()
        if existing:
            # Update existing event count
            c.execute("""
            UPDATE events SET count = ?, last_timestamp = ?, timestamp = ?
            WHERE id = ?
            """, (existing[1] + count, last_timestamp, datetime.utcnow(), existing[0]))
        else:
            # Insert new event
            c.execute("""
            INSERT INTO events (cluster, namespace, object_name, object_kind, event_type, reason, message, count, first_timestamp, last_timestamp, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (cluster, namespace, object_name, object_kind, event_type, reason, message, count, first_timestamp, last_timestamp, datetime.utcnow()))
        conn.commit()

def get_events(cluster=None, event_type=None, hours=24, limit=100):
    threshold = datetime.utcnow() - timedelta(hours=hours)
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        query = """
        SELECT id, cluster, namespace, object_name, object_kind, event_type, reason, message, count, timestamp
        FROM events WHERE timestamp >= ?
        """
        params = [threshold]
        
        if cluster:
            query += " AND cluster = ?"
            params.append(cluster)
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)
            
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        c.execute(query, params)
        rows = c.fetchall()
        
    events = []
    for row in rows:
        events.append({
            'id': row[0],
            'cluster': row[1],
            'namespace': row[2],
            'object_name': row[3],
            'object_kind': row[4],
            'event_type': row[5],
            'reason': row[6],
            'message': row[7],
            'count': row[8],
            'timestamp': row[9]
        })
    return events

def get_events_by_category(cluster=None, category=None, hours=24, limit=100):
    """Get events filtered by problem categories"""
    print(f"[DB] get_events_by_category called with: cluster={cluster}, category={category}, hours={hours}, limit={limit}")
    
    threshold = datetime.utcnow() - timedelta(hours=hours)
    
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        
        # First, let's see what events we have in total
        c.execute("SELECT COUNT(*) FROM events WHERE timestamp >= ?", [threshold])
        total_events = c.fetchone()[0]
        print(f"[DB] Total events in time range: {total_events}")
        
        # Show event types and reasons
        c.execute("SELECT event_type, reason, COUNT(*) FROM events WHERE timestamp >= ? GROUP BY event_type, reason", [threshold])
        event_stats = c.fetchall()
        print(f"[DB] Event statistics:")
        for stat in event_stats:
            print(f"[DB]   {stat[0]} - {stat[1]}: {stat[2]} events")
        
        # Base query
        query = """
        SELECT id, cluster, namespace, object_name, object_kind, event_type, reason, message, count, timestamp
        FROM events WHERE timestamp >= ?
        """
        params = [threshold]
        
        # Add cluster filter
        if cluster:
            query += " AND cluster = ?"
            params.append(cluster)
        
        # Add category filter
        if category and category != 'all':
            category_filter = get_category_filter(category)
            if category_filter:
                query += f" AND ({category_filter})"
                print(f"[DB] Applied category filter for '{category}': {category_filter}")
            else:
                print(f"[DB] No filter found for category: {category}")
            
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        print(f"[DB] Final query: {query}")
        print(f"[DB] Parameters: {params}")
        
        c.execute(query, params)
        rows = c.fetchall()
        
    events = []
    for row in rows:
        events.append({
            'id': row[0],
            'cluster': row[1],
            'namespace': row[2],
            'object_name': row[3],
            'object_kind': row[4],
            'event_type': row[5],
            'reason': row[6],
            'message': row[7],
            'count': row[8],
            'timestamp': row[9]
        })
    
    print(f"[DB] Returning {len(events)} events for category: {category}")
    return events

def get_category_filter(category):
    """Return SQL filter condition for event categories"""
    filters = {
        'critical': "(reason IN ('CrashLoopBackOff', 'ImagePullBackOff', 'OOMKilled', 'Evicted', 'NodeNotReady') OR message LIKE '%OutOfMemory%')",
        
        'pod-issues': "(reason IN ('Failed', 'BackOff', 'Unhealthy', 'Killing', 'Preempting') OR (event_type = 'Warning' AND object_kind = 'Pod'))",
        
        'resource-issues': "(reason IN ('InsufficientMemory', 'InsufficientCPU', 'OutOfMemory', 'OutOfCPU', 'LimitExceeded') OR message LIKE '%memory%' OR message LIKE '%cpu%')",
        
        'network-issues': "(reason IN ('NetworkNotReady', 'CNINotReady', 'DNSConfigForming') OR message LIKE '%network%' OR message LIKE '%dns%')",
        
        'storage-issues': "(reason IN ('FailedMount', 'VolumeFailure', 'FailedAttachVolume', 'FailedDetachVolume') OR message LIKE '%volume%' OR message LIKE '%storage%')",
        
        'scheduling-issues': "(reason IN ('FailedScheduling', 'Unschedulable', 'NodeSelectorMismatching', 'InsufficientResourcesForPod'))",
        
        'Warning': "event_type = 'Warning'",
        'Normal': "event_type = 'Normal'"
    }
    
    return filters.get(category)

# Alerts functions  
def save_alert(cluster, rule_name, severity, message, metadata=None):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
        INSERT INTO alerts (cluster, rule_name, severity, message, metadata)
        VALUES (?, ?, ?, ?, ?)
        """, (cluster, rule_name, severity, message, metadata))
        conn.commit()
        return c.lastrowid

def get_alerts(cluster=None, status=None, severity=None, hours=168, limit=100):
    """Get alerts with optional filtering by cluster, status, severity"""
    threshold = datetime.utcnow() - timedelta(hours=hours)
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        query = """
        SELECT id, cluster, rule_name, severity, message, status, created_at, resolved_at
        FROM alerts WHERE created_at >= ?
        """
        params = [threshold]
        
        if cluster and cluster != 'all':
            query += " AND cluster = ?"
            params.append(cluster)
        if status:
            query += " AND status = ?"
            params.append(status)
        if severity:
            query += " AND severity = ?"
            params.append(severity)
            
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        print(f"[DB] Alerts query: {query}")
        print(f"[DB] Alerts params: {params}")
        
        c.execute(query, params)
        rows = c.fetchall()
        
    alerts = []
    for row in rows:
        alerts.append({
            'id': row[0],
            'cluster': row[1],
            'rule_name': row[2],
            'severity': row[3],
            'message': row[4],
            'status': row[5],
            'created_at': row[6],
            'resolved_at': row[7]
        })
    return alerts

def resolve_alert(alert_id):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
        UPDATE alerts SET status = 'resolved', resolved_at = ?
        WHERE id = ? AND status = 'active'
        """, (datetime.utcnow(), alert_id))
        conn.commit()
        return c.rowcount > 0
