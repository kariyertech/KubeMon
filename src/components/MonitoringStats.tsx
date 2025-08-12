import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface MonitoringStatsProps {
  totalPods: number;
  healthyPods: number;
  unhealthyPods: number;
  lastUpdate: string;
  topRestartingPod?: { name: string; restarts: number; namespace: string } | null;
}

const MonitoringStats = ({ totalPods, healthyPods, unhealthyPods, lastUpdate, topRestartingPod }: MonitoringStatsProps) => {
  const healthPercentage = totalPods > 0 ? Math.round((healthyPods / totalPods) * 100) : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pods</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{healthyPods + unhealthyPods}</div>
          <p className="text-xs text-muted-foreground">
            Restart + CrashLoopBackOff
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Restart Pods</CardTitle>
          <CheckCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{healthyPods}</div>
          <p className="text-xs text-muted-foreground">
            Toplam restart pod sayısı
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CrashLoopBackOff Pods</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">{unhealthyPods}</div>
          <p className="text-xs text-muted-foreground">
            CrashLoopBackOff pod sayısı
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Restarting Pod</CardTitle>
          <CheckCircle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          {topRestartingPod ? (
            <>
              <div className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{topRestartingPod.name}</div>
              <div className="text-xs text-muted-foreground mt-1">Restarts: <span className="font-semibold">{topRestartingPod.restarts}</span></div>
              <div className="text-xs text-muted-foreground mt-1">Namespace: <span className="font-mono">{topRestartingPod.namespace}</span></div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No restart data</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringStats;
