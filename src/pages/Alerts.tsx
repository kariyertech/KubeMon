import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Settings } from 'lucide-react';
import Navigation from '@/components/Navigation';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Alert {
  id: number;
  cluster: string;
  rule_name: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  status: 'active' | 'resolved';
  created_at: string;
  resolved_at?: string;
}

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  // Cluster listesini çek
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        console.log('Fetching clusters from:', `${API_URL}/clusters`);
        const res = await axios.get(`${API_URL}/clusters`);
        console.log('Alerts - Clusters response:', res.data);
        setClusters(res.data);
        if (res.data.length > 0 && selectedCluster === 'all') {
          console.log('Alerts - Setting initial cluster to:', res.data[0].value);
          setSelectedCluster(res.data[0].value);
        }
      } catch (e) {
        console.error('Error fetching clusters:', e);
        setClusters([]);
      }
    };
    fetchClusters();
  }, []);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCluster !== 'all') params.append('cluster', selectedCluster);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedSeverity !== 'all') params.append('severity', selectedSeverity);
      
      console.log('Alerts - Fetching with params:', params.toString());
      console.log('Alerts - Selected cluster:', selectedCluster);
      console.log('Alerts - Selected status:', selectedStatus);
      console.log('Alerts - Selected severity:', selectedSeverity);
      
      const res = await axios.get(`${API_URL}/alerts?${params.toString()}`);
      console.log('Alerts - Response data:', res.data);
      setAlerts(res.data);
    } catch (e) {
      console.error('Error fetching alerts:', e);
      setAlerts([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // 30 saniyede bir güncelle
    return () => clearInterval(interval);
  }, [selectedCluster, selectedStatus, selectedSeverity]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <CheckCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = activeAlerts.filter(alert => alert.severity === 'warning');

  // Debug logging for stats
  console.log('Alerts - Statistics:');
  console.log('  Total alerts:', alerts.length);
  console.log('  Active alerts:', activeAlerts.length);
  console.log('  Critical alerts:', criticalAlerts.length);
  console.log('  Warning alerts:', warningAlerts.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-red-900">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 dark:from-red-500 dark:to-red-600 rounded-xl shadow-lg">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-red-600 dark:from-white dark:to-red-400 bg-clip-text text-transparent">
                  Alert Management
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg mt-1">
                  Monitor and manage cluster alerts and notifications
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={fetchAlerts} 
                disabled={isLoading}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical Alerts</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Warning Alerts</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{warningAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Active</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
          <CardHeader>
            <CardTitle>Alert Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Cluster</label>
                <select 
                  value={selectedCluster} 
                  onChange={(e) => setSelectedCluster(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="all">All Clusters</option>
                  {clusters.map((cluster) => (
                    <option key={cluster.value} value={cluster.value}>
                      {cluster.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Severity</label>
                <select 
                  value={selectedSeverity} 
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Active Alerts
              <Badge variant="secondary">{alerts.length} alerts</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-gray-300 h-10 w-10"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No Active Alerts</h3>
                <p className="text-gray-500">All systems are running smoothly!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex-shrink-0">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getSeverityBadgeColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusBadgeColor(alert.status)}>
                          {alert.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{alert.cluster}</Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {alert.rule_name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {alert.message}
                      </div>
                      {alert.resolved_at && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Resolved: {new Date(alert.resolved_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Alerts;
