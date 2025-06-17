
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Server } from "lucide-react";

interface ClusterSelectorProps {
  selectedCluster: string;
  onClusterChange: (cluster: string) => void;
  clusters: Array<{ name: string; status: 'online' | 'offline' }>;
}

const ClusterSelector = ({ selectedCluster, onClusterChange, clusters }: ClusterSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Server className="w-4 h-4" />
        Select Kubernetes Cluster
      </label>
      <Select value={selectedCluster} onValueChange={onClusterChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a cluster to monitor" />
        </SelectTrigger>
        <SelectContent>
          {clusters.map((cluster) => (
            <SelectItem key={cluster.name} value={cluster.name}>
              <div className="flex items-center justify-between w-full">
                <span>{cluster.name}</span>
                <Badge 
                  variant={cluster.status === 'online' ? 'default' : 'destructive'}
                  className="ml-2"
                >
                  {cluster.status}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ClusterSelector;
