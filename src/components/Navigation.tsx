import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, AlertTriangle, Brain } from 'lucide-react';
import { Button } from "@/components/ui/button";
import ThemeToggle from './ThemeToggle';

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Pods', icon: Home },
    { path: '/events', label: 'Events', icon: Calendar },
    { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
    { path: '/ai-analyze', label: 'AI Analyze', icon: Brain },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-lg shadow-lg">
              <img 
                src={import.meta.env.BASE_URL + 'kubemon.png'} 
                alt="KubeMon" 
                className="w-8 h-8 object-contain" 
                onError={(e) => { 
                  e.currentTarget.onerror = null; 
                  e.currentTarget.src = '/placeholder.svg'; 
                }} 
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
              KubeMon
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className={`flex items-center space-x-2 transition-all duration-300 ${
                      isActive(item.path)
                        ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
