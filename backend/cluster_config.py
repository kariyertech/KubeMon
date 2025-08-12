# Cluster-specific namespace configuration
# Her cluster için sadece belirli namespace'leri göster

CLUSTER_NAMESPACE_CONFIG = {
    "demo1": {
        "allowed_namespaces": ["demo1"],
        "exclude_namespaces": []  # Sadece demo1 namespace'ini göster, diğerlerini gizle
    },
    "demo2": {
        "allowed_namespaces": ["demo2"],
        "exclude_namespaces": []
    },
    "demo3": {
        "allowed_namespaces": ["demo3"],
        "exclude_namespaces": []
    },
    "production": {
        "allowed_namespaces": ["production"],
        "exclude_namespaces": []
    },
    "staging": {
        "allowed_namespaces": ["staging"],
        "exclude_namespaces": []
    },
    "development": {
        "allowed_namespaces": ["development"],
        "exclude_namespaces": []
    },
    
    # Default config (eğer cluster bulunamazsa tüm namespace'leri göster)
    "default": {
        "allowed_namespaces": [],  # Boşsa tüm namespace'leri göster
        "exclude_namespaces": []
    }
}

def get_namespace_filter(cluster_name):
    """
    Cluster için namespace filter'ını döndürür
    """
    cluster_name = cluster_name.lower() if cluster_name else "default"
    config = CLUSTER_NAMESPACE_CONFIG.get(cluster_name, CLUSTER_NAMESPACE_CONFIG["default"])
    
    return {
        "allowed": config.get("allowed_namespaces", []),
        "excluded": config.get("exclude_namespaces", [])
    }

def should_include_namespace(cluster_name, namespace):
    """
    Bu namespace'in gösterilip gösterilmeyeceğini belirler
    """
    if not cluster_name or not namespace:
        return True
        
    filter_config = get_namespace_filter(cluster_name)
    
    # Eğer allowed list varsa, sadece o listedeki namespace'leri göster
    if filter_config["allowed"]:
        return namespace in filter_config["allowed"]
    
    # Eğer allowed list boşsa tüm namespace'leri göster
    return True