import React, { useState } from 'react';
import { 
  Database, Search, Link, Shield, Users, Code, Download, 
  Settings, Zap, AlertTriangle, FileText, Activity 
} from 'lucide-react';
import { useSubscription } from '../../../context/SubscriptionContext';
import AdvancedTableBuilder from '../tools/AdvancedTableBuilder';
import RelationshipPanel from '../tools/RelationshipPanel';
import SQLAnomalyValidator from '../tools/SQLAnomalyValidator';
import LiveSQLEditor from '../tools/LiveSQLEditor';
import SmartExportManager from '../tools/SmartExportManager';
import RealTimeCollaboration from '../tools/RealTimeCollaboration';
import VisualQueryBuilder from '../tools/VisualQueryBuilder';
import ZeroCodeCRUDBuilder from '../tools/ZeroCodeCRUDBuilder';

type ActiveTool = 
  | 'advanced_table' 
  | 'relationships' 
  | 'sql_validator' 
  | 'live_sql' 
  | 'smart_export' 
  | 'collaboration'
  | 'query_builder'
  | 'crud_builder'
  | null;

const AdvancedToolsPanel: React.FC = () => {
  const { currentPlan } = useSubscription();
  const [activeTool, setActiveTool] = useState<ActiveTool>('advanced_table');

  const tools = [
    {
      id: 'advanced_table' as const,
      name: 'Advanced Tables',
      icon: Database,
      description: 'Create tables with FK validation',
      category: 'design',
      requiresPlan: 'free' as const
    },
    {
      id: 'relationships' as const,
      name: 'Relationships',
      icon: Link,
      description: 'Manage table relationships',
      category: 'design',
      requiresPlan: 'free' as const
    },
    {
      id: 'query_builder' as const,
      name: 'Query Builder',
      icon: Search,
      description: 'Visual query construction',
      category: 'data',
      requiresPlan: 'free' as const
    },
    {
      id: 'crud_builder' as const,
      name: 'Data Manager',
      icon: FileText,
      description: 'CRUD operations',
      category: 'data',
      requiresPlan: 'free' as const
    },
    {
      id: 'sql_validator' as const,
      name: 'SQL Validator',
      icon: AlertTriangle,
      description: 'Schema validation & audit',
      category: 'validation',
      requiresPlan: 'pro' as const
    },
    {
      id: 'live_sql' as const,
      name: 'Live SQL',
      icon: Code,
      description: 'Real-time SQL editor',
      category: 'development',
      requiresPlan: 'pro' as const
    },
    {
      id: 'smart_export' as const,
      name: 'Smart Export',
      icon: Download,
      description: 'Advanced export options',
      category: 'export',
      requiresPlan: 'pro' as const
    },
    {
      id: 'collaboration' as const,
      name: 'Collaboration',
      icon: Users,
      description: 'Real-time team features',
      category: 'collaboration',
      requiresPlan: 'ultimate' as const
    }
  ];

  const getToolAvailability = (tool: typeof tools[0]) => {
    switch (tool.requiresPlan) {
      case 'free':
        return true;
      case 'pro':
        return currentPlan === 'pro' || currentPlan === 'ultimate';
      case 'ultimate':
        return currentPlan === 'ultimate';
      default:
        return false;
    }
  };

  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, typeof tools>);

  const categoryIcons = {
    design: Database,
    data: FileText,
    validation: AlertTriangle,
    development: Code,
    export: Download,
    collaboration: Users
  };

  const categoryColors = {
    design: 'text-blue-600 dark:text-blue-400',
    data: 'text-green-600 dark:text-green-400',
    validation: 'text-yellow-600 dark:text-yellow-400',
    development: 'text-purple-600 dark:text-purple-400',
    export: 'text-indigo-600 dark:text-indigo-400',
    collaboration: 'text-pink-600 dark:text-pink-400'
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 pt-16 lg:pt-0">
      {/* Tool Categories & Selection */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Advanced Tools
          </h3>
          
          {/* Tool Categories */}
          <div className="space-y-4">
            {Object.entries(groupedTools).map(([category, categoryTools]) => {
              const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];
              const categoryColor = categoryColors[category as keyof typeof categoryColors];
              
              return (
                <div key={category} className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm font-medium ${categoryColor}`}>
                    <CategoryIcon className="w-4 h-4" />
                    <span className="capitalize">{category}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {categoryTools.map(tool => {
                      const Icon = tool.icon;
                      const isAvailable = getToolAvailability(tool);
                      const isActive = activeTool === tool.id;
                      
                      return (
                        <button
                          key={tool.id}
                          onClick={() => isAvailable && setActiveTool(tool.id)}
                          disabled={!isAvailable}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200
                            ${isActive && isAvailable
                              ? 'bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-500 text-sky-700 dark:text-sky-300'
                              : isAvailable
                              ? 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                              : 'bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed border-2 border-transparent'
                            }
                          `}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isActive && isAvailable
                              ? 'bg-sky-100 dark:bg-sky-800'
                              : 'bg-white dark:bg-gray-600'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{tool.name}</span>
                              {!isAvailable && (
                                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                                  {tool.requiresPlan === 'pro' ? 'Pro' : 'Ultimate'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {tool.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Tool Content */}
      <div className="flex-1 overflow-hidden">
        {activeTool === 'advanced_table' && <AdvancedTableBuilder />}
        {activeTool === 'relationships' && <RelationshipPanel />}
        {activeTool === 'query_builder' && <VisualQueryBuilder />}
        {activeTool === 'crud_builder' && <ZeroCodeCRUDBuilder />}
        {activeTool === 'sql_validator' && <SQLAnomalyValidator />}
        {activeTool === 'live_sql' && <LiveSQLEditor />}
        {activeTool === 'smart_export' && <SmartExportManager />}
        {activeTool === 'collaboration' && <RealTimeCollaboration />}
        
        {!activeTool && (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <Settings className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Select a tool to get started
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Plan Status */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Current Plan: <span className="font-medium capitalize">{currentPlan}</span>
            </span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {tools.filter(t => getToolAvailability(t)).length}/{tools.length} tools available
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedToolsPanel;