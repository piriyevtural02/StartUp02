import React, { useState } from 'react';
import { Plus, Code, Link, Download, ChevronDown, ChevronUp, Play, Database, Shield, Search, Settings, Users, Tag } from 'lucide-react';
import { useSubscription } from '../../../context/SubscriptionContext'; // Added subscription context
import ZeroCodeDDLBuilder from '../tools/ZeroCodeDDLBuilder';
import ZeroCodeCRUDBuilder from '../tools/ZeroCodeCRUDBuilder';
import VisualQueryBuilder from '../tools/VisualQueryBuilder';
import RelationshipBuilder from '../tools/RelationshipBuilder';
import SecurityManager from '../tools/SecurityManager';
import EnhancedTeamCollaboration from '../tools/EnhancedTeamCollaboration'; // Enhanced team collaboration
import ExportDropdown from '../tools/ExportDropdown';
import EnhancedTableBuilder from '../tools/EnhancedTableBuilder';
import SmartExportManager from '../tools/SmartExportManager';

type ActiveTool = 'ddl' | 'crud' | 'query' | 'relationship' | 'security' | 'team' | null;

const ToolsPanel: React.FC = () => {
  const { currentPlan } = useSubscription(); // Added subscription hook
  const [activeTool, setActiveTool] = useState<ActiveTool>('ddl');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Schema Design': true,
    'Validation': false,
    'Import/Export': false,
    'Collaboration': false
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Organize tools by categories
  const toolCategories = {
    'Schema Design': [
      {
        id: 'ddl' as const,
        name: 'Table Builder',
        icon: Database,
        description: 'Create and alter tables with FK validation',
      },
      {
        id: 'relationship' as const,
        name: 'Relationships',
        icon: Link,
        description: 'Define table relationships',
      },
      {
        id: 'crud' as const,
        name: 'Data Manager',
        icon: Plus,
        description: 'Insert, update, and delete data',
      },
      {
        id: 'query' as const,
        name: 'Query Builder',
        icon: Search,
        description: 'Build visual queries',
      }
    ],
    'Validation': [
      {
        id: 'security' as const,
        name: 'Security',
        icon: Shield,
        description: 'Manage users and permissions',
      }
    ],
    'Import/Export': [],
    'Collaboration': [
      ...(currentPlan === 'ultimate' ? [
        {
          id: 'team' as const,
          name: 'Team Collaboration',
          icon: Users,
          description: 'Invite team members and manage workspace access',
        }
      ] : [])
    ]
  };

  const allTools = Object.values(toolCategories).flat();
    {
      id: 'ddl' as const,
      name: 'DDL Builder',
      icon: Database,
      description: 'Create, alter, and drop tables',
    },
    {
      id: 'crud' as const,
      name: 'Data Manager',
      icon: Plus,
      description: 'Insert, update, and delete data',
    },
    {
      id: 'query' as const,
      name: 'Query Builder',
      icon: Search,
      description: 'Build visual queries',
    },
    {
      id: 'relationship' as const,
      name: 'Relationships',
      icon: Link,
      description: 'Define table relationships',
    },
    // Conditionally show Security or Team Collaboration based on plan
    ...(currentPlan === 'ultimate' ? [
      {
        id: 'team' as const,
        name: 'Team Collaboration',
        icon: Users,
        description: 'Invite team members and manage workspace access',
      }
    ] : [
      {
        id: 'security' as const,
        name: 'Security',
        icon: Shield,
        description: 'Manage users and permissions',
      }
    ]),
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 pt-16 lg:pt-0">
      {/* Header with Collapse Toggle */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tools
          </h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors duration-200"
            title={isCollapsed ? "Expand tools panel" : "Collapse tools panel"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Tool Categories */}
      <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="p-4 space-y-3">
              {Object.entries(toolCategories).map(([category, tools]) => (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center justify-between w-full text-left py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {category}
                      </span>
                      <span className="text-xs text-gray-500">({tools.length})</span>
                    </div>
                    {expandedCategories[category] ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedCategories[category] && (
                    <div className="ml-6 space-y-1">
                      {tools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                            className={`
                              flex items-center gap-3 w-full py-2 px-3 text-sm rounded-lg transition-colors duration-200
                              ${activeTool === tool.id
                                ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                              }
                            `}
                            title={tool.description}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{tool.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
      </div>

      {/* Active Tool Content */}
      <div className="flex-1 overflow-hidden">
        {activeTool === 'ddl' && <ZeroCodeDDLBuilder />}
        {activeTool === 'crud' && <ZeroCodeCRUDBuilder />}
        {activeTool === 'query' && <VisualQueryBuilder />}
        {activeTool === 'relationship' && <RelationshipBuilder />}
        {activeTool === 'security' && <SecurityManager />}
        {activeTool === 'team' && <EnhancedTeamCollaboration />} {/* Enhanced team collaboration */}
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

      {/* Export Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <ExportDropdown />
      </div>
        </>
      )}
    </div>
  );
};

export default ToolsPanel;