import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MonitoringStats from '@/components/MonitoringStats';
import PodGrid from '@/components/PodGrid';
import Navigation from '@/components/Navigation';
import { RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const Index = () => {
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [pods, setPods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toISOString());
  const [filterHours, setFilterHours] = useState(24); // 24 = 1 gün (default), 168 = 7 gün

  // Debug information
  console.log('API_URL:', API_URL);
  console.log('Environment VITE_API_URL:', import.meta.env.VITE_API_URL);

  // Dinamik cluster listesini çek
  useEffect(() => {
    console.log('Index - Fetching clusters from:', `${API_URL}/clusters`);
    axios.get(`${API_URL}/clusters`)
      .then(res => {
        console.log('Index - Clusters response:', res.data);
        setClusters(res.data);
        if (res.data.length > 0 && !selectedCluster) {
          console.log('Index - Setting initial cluster to:', res.data[0]);
          setSelectedCluster(res.data[0]);
        }
      })
      .catch(err => {
        console.error('Error fetching clusters:', err);
      });
    // eslint-disable-next-line
  }, []);

  const fetchPods = async (clusterValue, hours = filterHours) => {
    setIsLoading(true);
    console.log(`Fetching pods for cluster: ${clusterValue}, hours: ${hours}`);
    try {
      const res = await axios.get(`${API_URL}/pods?cluster=${clusterValue}&hours=${hours}`);
      console.log(`Fetched ${res.data.length} pods for ${hours} hours`);
      setPods(res.data);
      setLastUpdate(new Date().toISOString());
    } catch (e) {
      console.error('Error fetching pods:', e);
      setPods([]);
      setLastUpdate(new Date().toISOString());
    }
    setIsLoading(false);
  };

  useEffect(() => {
    console.log(`Filter changed to: ${filterHours} hours`);
    if (selectedCluster) {
      fetchPods(selectedCluster.value, filterHours);
    }
    // eslint-disable-next-line
  }, [selectedCluster, filterHours]);

  const handleRefresh = () => {
    if (selectedCluster) fetchPods(selectedCluster.value, filterHours);
  };

  const handleClusterChange = (cluster) => {
    setSelectedCluster(cluster);
  };

  const handleFilterChange = (hours) => {
    console.log(`Changing filter from ${filterHours} to ${hours}`);
    setFilterHours(hours);
  };

  // Benzersiz podları hesapla - useMemo ile optimize et
  const uniquePods = useMemo(() => {
    const uniquePodsMap = new Map();
    pods.forEach((pod) => {
      const key = `${pod.namespace}/${pod.name}`;
      if (!uniquePodsMap.has(key)) {
        uniquePodsMap.set(key, pod);
      }
    });
    const result = Array.from(uniquePodsMap.values());
    console.log(`Unique pods calculation: ${pods.length} total pods -> ${result.length} unique pods`);
    return result;
  }, [pods]);

  // Dashboard stats - useMemo ile optimize et  
  const dashboardStats = useMemo(() => {
    const healthyPods = uniquePods.filter((pod) => pod.restarts > 0).length;
    const unhealthyPods = uniquePods.filter((pod) => pod.status === 'CrashLoopBackOff').length;
    const topRestartingPod = uniquePods.reduce((max, pod) => {
      if (!max || (pod.restarts > (max.restarts || 0))) {
        return pod;
      }
      return max;
    }, null);

    const stats = {
      totalPods: uniquePods.length,
      healthyPods,
      unhealthyPods,
      topRestartingPod
    };

    console.log(`Dashboard Stats - Filter: ${filterHours}h, Unique: ${uniquePods.length}, Total: ${stats.totalPods}, Restarts: ${stats.healthyPods}, CrashLoop: ${stats.unhealthyPods}`);
    
    return stats;
  }, [uniquePods, filterHours]);

  // pods state değişikliğini takip et
  useEffect(() => {
    console.log(`Pods state updated: ${pods.length} total pods`);
  }, [pods]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 transition-colors duration-300">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-xl shadow-lg">
                <img src={import.meta.env.BASE_URL + 'kubemon.png'} alt="KubeMon Logo" className="w-12 h-12 object-contain" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }} />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
                  Pod Monitoring
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg mt-1">
                  Real-time pod status and health monitoring{selectedCluster ? ` - ${selectedCluster.label} Cluster` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleRefresh} 
                disabled={isLoading}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-lg transition-all duration-300"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Cluster Selection */}
        <Card className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 dark:text-white text-xl">Select Cluster</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {clusters.map((cluster) => (
                <Button
                  key={cluster.value}
                  variant={selectedCluster && selectedCluster.value === cluster.value ? "default" : "outline"}
                  onClick={() => setSelectedCluster(cluster)}
                  disabled={isLoading}
                  className={`min-w-[90px] transition-all duration-300 ${
                    selectedCluster && selectedCluster.value === cluster.value
                      ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-lg scale-105'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {cluster.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 justify-end">
          <Button
            variant={filterHours === 24 ? "default" : "outline"}
            onClick={() => handleFilterChange(24)}
            disabled={isLoading}
          >
            Last 24h
          </Button>
          <Button
            variant={filterHours === 168 ? "default" : "outline"}
            onClick={() => handleFilterChange(168)}
            disabled={isLoading}
          >
            Last 7d
          </Button>
        </div>

        {/* Monitoring Stats */}
        <div className="mb-8">
          <MonitoringStats
            totalPods={dashboardStats.totalPods}
            healthyPods={dashboardStats.healthyPods}
            unhealthyPods={dashboardStats.unhealthyPods}
            lastUpdate={lastUpdate}
            topRestartingPod={dashboardStats.topRestartingPod}
          />
        </div>

        {/* Pods Grid */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 dark:text-white text-xl">
              Pod Status Overview{selectedCluster ? ` - ${selectedCluster.label} Cluster` : ''}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Showing {uniquePods.length} pods{selectedCluster ? ` from ${selectedCluster.label} cluster` : ''}
            </p>
          </CardHeader>
          <CardContent>
            <PodGrid pods={uniquePods} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Pod monitoring updates every 5 minutes • Backend powered by Python & SQLite</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
