import os
from kubernetes import client, config
from database import save_event
from datetime import datetime

def collect_events_from_cluster(kubeconfig_path, cluster_name):
    """Collect Kubernetes events from a cluster"""
    print(f"[EVENTS] Collecting events from cluster: {cluster_name}")
    
    try:
        config.load_kube_config(config_file=kubeconfig_path)
        v1 = client.CoreV1Api()
        
        # Get events from all namespaces
        try:
            events = v1.list_event_for_all_namespaces()
        except Exception as e:
            print(f"[EVENTS][ERROR] {cluster_name}: Failed to list events: {e}")
            return
        
        event_count = 0
        for event in events.items:
            try:
                # Parse event details - namespace bilgisi involved_object'ten alınır
                namespace = event.involved_object.namespace if event.involved_object and event.involved_object.namespace else 'default'
                object_name = event.involved_object.name if event.involved_object else 'unknown'
                object_kind = event.involved_object.kind if event.involved_object else 'unknown'
                event_type = event.type or 'Normal'
                reason = event.reason or 'Unknown'
                message = event.message or 'No message'
                count = event.count or 1
                
                # Parse timestamps
                first_timestamp = event.first_timestamp or event.creation_timestamp
                last_timestamp = event.last_timestamp or event.creation_timestamp
                
                # Convert to string format for database
                first_ts_str = first_timestamp.strftime("%Y-%m-%d %H:%M:%S") if first_timestamp else datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                last_ts_str = last_timestamp.strftime("%Y-%m-%d %H:%M:%S") if last_timestamp else datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                
                # Filter out routine events (optional)
                if should_include_event(event_type, reason):
                    save_event(
                        cluster_name, 
                        namespace, 
                        object_name, 
                        object_kind, 
                        event_type, 
                        reason, 
                        message,
                        first_ts_str,
                        last_ts_str,
                        count
                    )
                    event_count += 1
                    
                    # Log important events
                    if event_type == 'Warning' or reason in ['Failed', 'BackOff', 'Unhealthy']:
                        print(f"[EVENTS][WARNING] {cluster_name}/{namespace}/{object_name}: {reason} - {message}")
                        
            except Exception as e:
                print(f"[EVENTS][ERROR] {cluster_name}: Error processing event: {e}")
                continue
        
        print(f"[EVENTS] {cluster_name}: Collected {event_count} events")
        
    except Exception as e:
        print(f"[EVENTS][ERROR] Failed to collect events from cluster {cluster_name}: {e}")

def should_include_event(event_type, reason):
    """Filter events to include only relevant ones"""
    # Always include Warning events
    if event_type == 'Warning':
        return True
    
    # Include specific Normal events that are important
    important_reasons = [
        'Started', 'Created', 'Scheduled', 'Pulled', 'Created',
        'Failed', 'BackOff', 'Unhealthy', 'FailedScheduling',
        'FailedMount', 'NetworkNotReady', 'InsufficientMemory',
        'InsufficientCPU', 'NodeNotReady', 'ImagePullBackOff',
        'CrashLoopBackOff', 'OOMKilled', 'Evicted'
    ]
    
    return reason in important_reasons

def collect_all_cluster_events():
    """Collect events from all configured clusters"""
    print("[EVENTS] Starting event collection from all clusters...")
    
    cluster_dir = "clusters"
    if not os.path.exists(cluster_dir):
        print(f"[EVENTS][ERROR] Cluster directory {cluster_dir} not found")
        return
    
    for file in os.listdir(cluster_dir):
        if file.endswith(".conf"):
            cluster_name = file.replace("admin-", "").replace(".conf", "").lower()
            path = os.path.join(cluster_dir, file)
            print(f"[EVENTS] Processing cluster: {cluster_name}")
            
            try:
                collect_events_from_cluster(path, cluster_name)
            except Exception as e:
                print(f"[EVENTS][ERROR] {cluster_name} event collection failed: {e}")

if __name__ == "__main__":
    collect_all_cluster_events()
