import os
from kubernetes import client, config
from database import save_pod_status

def load_and_process_cluster(kubeconfig_path, cluster_name):
    print(f"[INFO] Processing cluster: {cluster_name} with kubeconfig: {kubeconfig_path}")
    try:
        config.load_kube_config(config_file=kubeconfig_path)
        v1 = client.CoreV1Api()
        try:
            namespaces = v1.list_namespace().items
        except Exception as e:
            print(f"[ERROR] {cluster_name}: Namespace list error: {e}")
            return
        if not namespaces:
            print(f"[WARN] {cluster_name}: No namespaces found!")
        for ns_obj in namespaces:
            ns = ns_obj.metadata.name
            try:
                pods = v1.list_namespaced_pod(ns)
            except Exception as e:
                print(f"[ERROR] {cluster_name}: Pod list error in ns {ns}: {e}")
                continue
            if not pods.items:
                print(f"[INFO] {cluster_name}: No pods in ns {ns}")
            for pod in pods.items:
                try:
                    restart_count = sum([cs.restart_count for cs in pod.status.container_statuses or []])
                    # Her container'ın state'ini ve waiting reason'larını detaylı logla
                    for cs in (pod.status.container_statuses or []):
                        print(f"[DEBUG] {pod.metadata.name} container: {cs.name} state: {cs.state}")
                        if cs.state and cs.state.waiting:
                            print(f"[DEBUG] {pod.metadata.name} container: {cs.name} waiting reason: {cs.state.waiting.reason}")
                    # CrashLoopBackOff tespitini güçlendir
                    crashloop = any(
                        cs.state and cs.state.waiting and cs.state.waiting.reason and cs.state.waiting.reason.startswith("CrashLoopBackOff")
                        for cs in pod.status.container_statuses or []
                    )
                    # Bazı durumlarda pod.status.phase de CrashLoopBackOff olabilir
                    phase_crashloop = hasattr(pod.status, 'phase') and pod.status.phase == "CrashLoopBackOff"
                    if restart_count > 0 or crashloop or phase_crashloop:
                        status = "CrashLoopBackOff" if (crashloop or phase_crashloop) else pod.status.phase
                        print(f"[INFO] Saving pod: {pod.metadata.name} ns: {ns} status: {status} restarts: {restart_count}")
                        save_pod_status(cluster_name, ns, pod.metadata.name, status, restart_count)
                except Exception as e:
                    print(f"[ERROR] {cluster_name}: Error processing pod in ns {ns}: {e}")
    except Exception as e:
        print(f"[ERROR] Failed to process cluster {cluster_name}: {e}")
