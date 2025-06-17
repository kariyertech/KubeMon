
import React from 'react';
import PodStatusCard from './PodStatusCard';
import { AlertCircle } from 'lucide-react';

interface Pod {
  name: string;
  namespace: string;
  status: 'Running' | 'CrashLoopBackOff' | 'Pending' | 'Failed';
  restarts: number;
  timestamp: string;
}

interface PodGridProps {
  pods: Pod[];
  isLoading?: boolean;
}

const PodGrid = ({ pods, isLoading = false }: PodGridProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 p-4">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-600 w-8 h-8 rounded-lg shadow-md"></div>
          </div>
        ))}
      </div>
    );
  }

  if (pods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
        <AlertCircle className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-xl font-medium mb-2 text-gray-700 dark:text-gray-300">No Pods Found</h3>
        <p className="text-sm">No pod data available</p>
      </div>
    );
  }

  // Sadece restart > 0 olan veya CrashLoopBackOff durumundaki podları göster
  const problematicPods = pods.filter(pod => 
    pod.restarts > 0 || pod.status === 'CrashLoopBackOff'
  );

  if (problematicPods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-green-600 dark:text-green-400">
        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-700 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <span className="text-3xl">✓</span>
        </div>
        <h3 className="text-xl font-medium mb-2 text-green-700 dark:text-green-300">All Pods Healthy</h3>
        <p className="text-sm text-green-600 dark:text-green-400">No pods with restarts or issues found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 p-4 min-h-[200px]">
      {problematicPods.map((pod, index) => (
        <PodStatusCard key={`${pod.name}-${index}`} pod={pod} />
      ))}
    </div>
  );
};

export default PodGrid;
