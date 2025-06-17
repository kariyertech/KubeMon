
import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface Pod {
  name: string;
  namespace: string;
  status: 'Running' | 'CrashLoopBackOff' | 'Pending' | 'Failed';
  restarts: number;
  timestamp: string;
}

interface PodStatusCardProps {
  pod: Pod;
}

const getStatusColor = (pod: Pod) => {
  if (pod.status === 'CrashLoopBackOff') {
    return 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700';
  }
  if (pod.restarts > 0) {
    return 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700';
  }
  return 'bg-gray-400 hover:bg-gray-500 dark:bg-gray-500 dark:hover:bg-gray-600';
};

const PodStatusCard = ({ pod }: PodStatusCardProps) => {
  const [showPodName, setShowPodName] = useState(false);

  const handleClick = () => {
    setShowPodName(true);
    setTimeout(() => setShowPodName(false), 3000);
  };

  const PodDetails = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-5 min-w-[320px] backdrop-blur-sm">
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-600 pb-3">
          <h4 className="font-semibold text-gray-900 dark:text-white text-base">Pod Details</h4>
        </div>
        
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Pod Name</div>
            <div className="text-sm font-mono text-gray-900 dark:text-white break-all leading-relaxed">
              {pod.name}
            </div>
          </div>
          
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-3">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Restarts</span>
            <Badge 
              variant={pod.restarts > 0 ? "destructive" : "secondary"} 
              className="text-sm font-semibold px-3 py-1"
            >
              {pod.restarts}
            </Badge>
          </div>
          
          {pod.status === 'CrashLoopBackOff' && (
            <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg p-3">
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Status</span>
              <Badge variant="destructive" className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 px-3 py-1">
                {pod.status}
              </Badge>
            </div>
          )}
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-3">
            <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">Last Updated</div>
            <div className="text-sm text-purple-800 dark:text-purple-200 font-medium">
              {new Date(pod.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`w-8 h-8 ${getStatusColor(pod)} border-2 border-white dark:border-gray-800 shadow-lg cursor-pointer hover:scale-110 transition-all duration-300 rounded-lg relative overflow-hidden group`}
              onClick={handleClick}
            >
              <div className="absolute inset-0 bg-white/20 dark:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 animate-pulse opacity-30" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="p-0 bg-transparent border-none shadow-none">
            <PodDetails />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showPodName && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-4 py-2 rounded-lg whitespace-nowrap z-20 shadow-xl border border-gray-700 dark:border-gray-300">
          <div className="font-mono font-medium">{pod.name}</div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PodStatusCard;
