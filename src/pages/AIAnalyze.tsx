import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Calendar, AlertCircle, Loader2, BarChart3, FileText, ArrowRight } from 'lucide-react';
import Navigation from '@/components/Navigation';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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

const AIAnalyze = () => {
  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<EventAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const res = await axios.get(`${API_URL}/events/ai-status`);
        setAiAvailable(res.data.available);
      } catch (e) {
        setAiAvailable(false);
      }
      setIsLoading(false);
    };
    checkAIStatus();
  }, []);

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const res = await axios.get(`${API_URL}/clusters`);
        setClusters(res.data);
        if (res.data.length > 0 && !selectedCluster) {
          setSelectedCluster(res.data[0].value);
        }
      } catch (e) {}
    };
    fetchClusters();
  }, []);

  const analyzeClusterEvents = async () => {
    if (!selectedCluster || !aiAvailable) return;
    setIsAnalyzing(true);
    try {
      const res = await axios.post(`${API_URL}/events/analyze`, {
        cluster: selectedCluster,
        hours: 24
      });
      setAiAnalysis(res.data);
    } catch (e) {
      alert('Event analysis failed. Please try again.');
    }
    setIsAnalyzing(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
        <Navigation />
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="ml-2 text-lg">Checking AI service status...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
      <Navigation />
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 rounded-xl shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent">
                  AI Event Analyzer
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg mt-1">
                  Intelligent event analysis and cluster insights
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={aiAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {aiAvailable ? '🤖 AI Online' : '❌ AI Offline'}
              </Badge>
            </div>
          </div>
        </div>
        {!aiAvailable && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">AI Service Unavailable</p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    OpenAI API key not configured or service is down
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Event Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Cluster</label>
                  <select 
                    value={selectedCluster} 
                    onChange={(e) => setSelectedCluster(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                    disabled={!aiAvailable}
                  >
                    {clusters.map((cluster) => (
                      <option key={cluster.value} value={cluster.value}>
                        {cluster.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button 
                  onClick={analyzeClusterEvents}
                  disabled={!aiAvailable || isAnalyzing || !selectedCluster}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Events...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze Events
                    </>
                  )}
                </Button>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">What it does:</h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Analyzes last 24 hours of events</li>
                    <li>• Identifies patterns and issues</li>
                    <li>• Provides root cause analysis</li>
                    <li>• Suggests actionable recommendations</li>
                    <li>• Assesses risk levels</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="lg:col-span-2">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  AI Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!aiAnalysis ? (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No Analysis Yet</h3>
                    <p className="text-gray-500">Select a cluster and click "Analyze Events" to get AI insights.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-lg">{aiAnalysis.cluster} Analysis</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {aiAnalysis.events_analyzed} events analyzed from last {aiAnalysis.timeframe_hours} hours
                        </p>
                      </div>
                      <div className="text-right">
                        {/* Kategorilerde risk_level varsa en yükseğini bulup göster */}
                        {(() => {
                          const analysis = aiAnalysis.analysis || {};
                          // Sadece object olan ve risk_level içeren kategorileri al
                          const riskLevels = Object.entries(analysis)
                            .filter(([k, v]) => typeof v === 'object' && v !== null && !Array.isArray(v) && (v as any).risk_level)
                            .map(([k, v]) => (v as any).risk_level?.toLowerCase());
                          const order = ['critical', 'high', 'medium', 'low'];
                          const maxRisk = riskLevels.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] || 'unknown';
                          return (
                            <Badge className={getRiskLevelColor(maxRisk)}>
                              {maxRisk.toUpperCase()} RISK
                            </Badge>
                          );
                        })()}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(aiAnalysis.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {/* Kategori bazlı analizleri göster */}
                    {Object.entries(aiAnalysis.analysis)
                      .filter(([key, value]) => typeof value === 'object' && value !== null && !Array.isArray(value) && !['ai_model', 'tokens_used'].includes(key))
                      .map(([category, data]: [string, any]) => (
                        <Card key={category} className="mb-6 bg-white/90 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow">
                          <CardHeader>
                            <div className="flex items-center mb-2">
                              <span className="font-bold text-indigo-700 dark:text-indigo-300 mr-2">{category}</span>
                              {data.risk_level && (
                                <Badge className={getRiskLevelColor(data.risk_level)}>{data.risk_level.toUpperCase()} RISK</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            {/* Özet (Summary) as a card */}
                            <Card className="mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                              <CardHeader>
                                <span className="font-medium text-blue-800 dark:text-blue-200">Özet:</span>
                              </CardHeader>
                              <CardContent>
                                <span className="text-blue-700 dark:text-blue-300">{data.summary ? translateSummary(data.summary) : 'AI tarafından özet sağlanmadı.'}</span>
                              </CardContent>
                            </Card>
                            {/* Sorunlar */}
                            {Array.isArray(data.issues) && data.issues.length > 0 ? (
                              <Card className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
                                <CardHeader>
                                  <span className="font-medium text-red-800 dark:text-red-200">Sorunlar:</span>
                                </CardHeader>
                                <CardContent>
                                  <ul className="list-disc ml-6 text-red-700 dark:text-red-300">
                                    {data.issues.map((issue: string, idx: number) => (
                                      <li key={idx}>{translateIssue(issue)}</li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                            ) : (
                              <Card className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
                                <CardHeader>
                                  <span className="font-medium text-red-800 dark:text-red-200">Sorunlar:</span>
                                </CardHeader>
                                <CardContent>
                                  <span className="text-red-700 dark:text-red-300">Sorun tespit edilmedi.</span>
                                </CardContent>
                              </Card>
                            )}
                            {/* Kök Neden */}
                            {data.root_cause ? (
                              <Card className="mb-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
                                <CardHeader>
                                  <span className="font-medium text-purple-800 dark:text-purple-200">Kök Neden:</span>
                                </CardHeader>
                                <CardContent>
                                  <span className="text-purple-700 dark:text-purple-300">{translateRootCause(data.root_cause)}</span>
                                </CardContent>
                              </Card>
                            ) : (
                              <Card className="mb-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
                                <CardHeader>
                                  <span className="font-medium text-purple-800 dark:text-purple-200">Kök Neden:</span>
                                </CardHeader>
                                <CardContent>
                                  <span className="text-purple-700 dark:text-purple-300">Kök neden sağlanmadı.</span>
                                </CardContent>
                              </Card>
                            )}
                            {/* Öneriler */}
                            {Array.isArray(data.recommendations) && data.recommendations.length > 0 ? (
                              <Card className="mb-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                                <CardHeader>
                                  <span className="font-medium text-green-800 dark:text-green-200">Öneriler:</span>
                                </CardHeader>
                                <CardContent>
                                  <ul className="list-disc ml-6 text-green-700 dark:text-green-300">
                                    {data.recommendations.map((rec: string, idx: number) => (
                                      <li key={idx}>{translateRecommendation(rec)}</li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                            ) : (
                              <Card className="mb-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                                <CardHeader>
                                  <span className="font-medium text-green-800 dark:text-green-200">Öneriler:</span>
                                </CardHeader>
                                <CardContent>
                                  <span className="text-green-700 dark:text-green-300">Öneri sağlanmadı.</span>
                                </CardContent>
                              </Card>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    {/* Model ve token bilgisi */}
                    {(aiAnalysis.analysis.ai_model || aiAnalysis.analysis.tokens_used) && (
                      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          {aiAnalysis.analysis.ai_model && <span>Model: {aiAnalysis.analysis.ai_model}</span>}
                          {aiAnalysis.analysis.tokens_used && <span>Tokens: {aiAnalysis.analysis.tokens_used}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalyze;

// Türkçe çeviri fonksiyonları (en basit haliyle, anahtar kelime bazlı)
function translateSummary(summary: string) {
  return summary
    .replace('HorizontalPodAutoscaler failing to get scale due to no matches for kind \'Deployment\' in group \'extensions\'',
      'HorizontalPodAutoscaler, \'extensions\' grubunda \'Deployment\' türüyle eşleşme bulunamadığı için ölçek bilgisini alamıyor.')
    .replace('The issue is likely due to a misconfiguration or version incompatibility between the HorizontalPodAutoscaler and the Deployment resources.',
      'Sorunun nedeni büyük olasılıkla HorizontalPodAutoscaler ile Deployment kaynakları arasında bir yanlış yapılandırma veya sürüm uyumsuzluğudur.');
}
function translateIssue(issue: string) {
  return issue
    .replace('HorizontalPodAutoscaler failing to get scale due to no matches for kind \'Deployment\' in group \'extensions\'',
      'HorizontalPodAutoscaler, \'extensions\' grubunda \'Deployment\' türüyle eşleşme bulunamadığı için ölçek bilgisini alamıyor.');
}
function translateRootCause(root: string) {
  return root
    .replace('The issue is likely due to a misconfiguration or version incompatibility between the HorizontalPodAutoscaler and the Deployment resources.',
      'Sorunun nedeni büyük olasılıkla HorizontalPodAutoscaler ile Deployment kaynakları arasında bir yanlış yapılandırma veya sürüm uyumsuzluğudur.');
}
function translateRecommendation(rec: string) {
  return rec
    .replace('Check the compatibility between the HorizontalPodAutoscaler and Deployment resources',
      'HorizontalPodAutoscaler ile Deployment kaynaklarının uyumluluğunu kontrol edin')
    .replace('Ensure the correct API versions are being used for both resources',
      'Her iki kaynak için de doğru API versiyonlarının kullanıldığından emin olun')
    .replace('Review and update the configurations to match the expected resource types',
      'Yapılandırmaları gözden geçirip beklenen kaynak tiplerine uygun şekilde güncelleyin');
}
