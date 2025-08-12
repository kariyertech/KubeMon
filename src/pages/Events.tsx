import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, AlertTriangle, Info, CheckCircle, Brain, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Event {
  id: number;
  cluster: string;
  namespace: string;
  object_name: string;
  object_kind: string;
  event_type: string;
  reason: string;
  message: string;
  timestamp: string;
  count: number;
}

interface EventAnalysis {
  cluster: string;
  events_analyzed: number;
  timeframe_hours: number;
  analysis: {
    summary?: string;
    critical_issues?: string[];
    patterns?: string[];
    root_cause?: string;
    recommendations?: string[];
    risk_level?: string;
    ai_model?: string;
    tokens_used?: number;
  };
  timestamp: string;
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // AI Analysis states
  const [aiAnalysis, setAiAnalysis] = useState<EventAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);

  // Cluster listesini çek
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        console.log('Events - Fetching clusters from:', `${API_URL}/clusters`);
        const res = await axios.get(`${API_URL}/clusters`);
        console.log('Events - Clusters response:', res.data);
        setClusters(res.data);
        if (res.data.length > 0 && selectedCluster === 'all') {
          console.log('Events - Setting initial cluster to:', res.data[0].value);
          setSelectedCluster(res.data[0].value);
        }
      } catch (e) {
        console.error('Error fetching clusters:', e);
        setClusters([]);
      }
    };
    fetchClusters();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCluster !== 'all') params.append('cluster', selectedCluster);
      if (selectedType !== 'all') params.append('type', selectedType);
      
      console.log('Fetching events with params:', params.toString());
      const res = await axios.get(`${API_URL}/events?${params.toString()}`);
      console.log('Events response:', res.data);
      setEvents(res.data);
    } catch (e) {
      console.error('Error fetching events:', e);
      setEvents([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedCluster) {
      fetchEvents();
      const interval = setInterval(fetchEvents, 30000); // 30 saniyede bir güncelle
      return () => clearInterval(interval);
    }
  }, [selectedCluster, selectedType]);

  // Check AI status on load
  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const res = await axios.get(`${API_URL}/events/ai-status`);
        setAiAvailable(res.data.available);
      } catch (e) {
        console.error('AI status check failed:', e);
        setAiAvailable(false);
      }
    };
    checkAIStatus();
  }, []);

  // AI Event Analysis
  const analyzeEvents = async () => {
    if (!selectedCluster || selectedCluster === 'all') {
      alert('Please select a specific cluster to analyze events');
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await axios.post(`${API_URL}/events/analyze`, {
        cluster: selectedCluster,
        hours: 24
      });
      setAiAnalysis(res.data);
      setShowAnalysis(true);
    } catch (e) {
      console.error('Event analysis failed:', e);
      alert('Event analysis failed. Please try again.');
    }
    setIsAnalyzing(false);
  };

  const getEventIcon = (eventType: string, reason: string) => {
    if (reason.includes('Failed') || reason.includes('Error')) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    if (eventType === 'Warning') {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'Warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Normal': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-purple-700 dark:from-purple-500 dark:to-purple-600 rounded-xl shadow-lg">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-purple-600 dark:from-white dark:to-purple-400 bg-clip-text text-transparent">
                  Kubernetes Events
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg mt-1">
                  Real-time cluster events and activity monitoring
                </p>
              </div>
            </div>
            <Button 
              onClick={fetchEvents} 
              disabled={isLoading}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
          <CardHeader>
            <CardTitle>Event Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">Cluster</label>
                <select 
                  value={selectedCluster} 
                  onChange={(e) => setSelectedCluster(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  {clusters.length === 0 ? (
                    <option value="">Loading clusters...</option>
                  ) : (
                    clusters.map((cluster) => (
                      <option key={cluster.value} value={cluster.value}>
                        {cluster.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Event Category</label>
                <select 
                  value={selectedType} 
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="all">All Events</option>
                  <option value="critical">Critical Problems</option>
                  <option value="pod-issues">Pod Issues</option>
                  <option value="resource-issues">Resource Issues</option>
                  <option value="network-issues">Network Issues</option>
                  <option value="storage-issues">Storage Issues</option>
                  <option value="scheduling-issues">Scheduling Issues</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Timeline */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Events Timeline
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">{events.length} events</span>
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
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <Info className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No Events Found</h3>
                <p className="text-gray-500">No events match your current filters.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex-shrink-0">
                      {getEventIcon(event.event_type, event.reason)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventBadgeColor(event.event_type)}`}>
                          {event.event_type}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300">{event.cluster}</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300">{event.namespace}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.reason} - {event.object_kind}/{event.object_name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {event.message}
                      </div>
                      {event.count > 1 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Occurred {event.count} times
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

export default Events;
