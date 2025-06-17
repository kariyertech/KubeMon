import os
import time
from database import init_db, cleanup_old_data
from kube_client import load_and_process_cluster

print("[MAIN] Pod toplama ana döngüsü başlatılıyor...")

def main_loop():
    print("[MAIN] main_loop başladı...")
    cluster_dir = "clusters"
    for file in os.listdir(cluster_dir):
        if file.endswith(".conf"):
            # Cluster adını küçük harfe çevir
            cluster_name = file.replace("admin-", "").replace(".conf", "").lower()
            path = os.path.join(cluster_dir, file)
            print(f"[MAIN] {cluster_name} işleniyor...")
            try:
                load_and_process_cluster(path, cluster_name)
            except Exception as e:
                print(f"[MAIN][ERROR] {cluster_name} işlenirken hata: {e}")
    cleanup_old_data()

if __name__ == "__main__":
    print("[MAIN] init_db çağrılıyor...")
    init_db()
    while True:
        main_loop()
        time.sleep(300)  # Poll every 5 minutes
