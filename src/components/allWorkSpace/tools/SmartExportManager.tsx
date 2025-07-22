import React, { useState } from 'react';
import { Download, FileText, Database, Code, Settings, Check } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import { useSubscription } from '../../../context/SubscriptionContext';

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: string;
  extension: string;
  requiresPro?: boolean;
}

interface ExportOptions {
  includeData: boolean;
  includeIndexes: boolean;
  includeConstraints: boolean;
  includeComments: boolean;
  formatOutput: boolean;
  targetVersion?: string;
}

const SmartExportManager: React.FC = () => {
  const { currentSchema, exportSchema } = useDatabase();
  const { canUseFeature, setShowUpgradeModal, setUpgradeReason } = useSubscription();
  
  const [selectedFormat, setSelectedFormat] = useState<string>('mysql');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeData: false,
    includeIndexes: true,
    includeConstraints: true,
    includeComments: true,
    formatOutput: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<Array<{
    timestamp: Date;
    format: string;
    filename: string;
    size: string;
  }>>([]);

  const exportFormats: ExportFormat[] = [
    {
      id: 'mysql',
      name: 'MySQL',
      description: 'MySQL 5.7+ compatible SQL',
      icon: '🐬',
      extension: 'sql'
    },
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      description: 'PostgreSQL 12+ compatible SQL',
      icon: '🐘',
      extension: 'sql',
      requiresPro: true
    },
    {
      id: 'sqlserver',
      name: 'SQL Server',
      description: 'Microsoft SQL Server T-SQL',
      icon: '🏢',
      extension: 'sql',
      requiresPro: true
    },
    {
      id: 'oracle',
      name: 'Oracle',
      description: 'Oracle Database SQL',
      icon: '🔴',
      extension: 'sql',
      requiresPro: true
    },
    {
      id: 'mongodb',
      name: 'MongoDB',
      description: 'MongoDB collection schema',
      icon: '🍃',
      extension: 'js',
      requiresPro: true
    },
    {
      id: 'json',
      name: 'JSON Schema',
      description: 'Portable JSON format',
      icon: '📄',
      extension: 'json'
    },
    {
      id: 'csv',
      name: 'CSV Export',
      description: 'Table structure as CSV',
      icon: '📊',
      extension: 'csv'
    }
  ];

  const handleExport = async () => {
    const format = exportFormats.find(f => f.id === selectedFormat);
    if (!format) return;

    // Check if format requires Pro
    if (format.requiresPro && !canUseFeature('canExportSQL')) {
      setUpgradeReason(`${format.name} export is available in Pro and Ultimate plans. Upgrade to export to ${format.name}.`);
      setShowUpgradeModal(true);
      return;
    }

    setIsExporting(true);

    try {
      // Generate the export content
      let content = '';
      
      switch (selectedFormat) {
        case 'json':
          content = generateJSONExport();
          break;
        case 'csv':
          content = generateCSVExport();
          break;
        default:
          content = exportSchema(selectedFormat);
      }

      // Apply export options
      if (exportOptions.formatOutput && selectedFormat !== 'json') {
        content = formatSQLOutput(content);
      }

      // Generate smart filename based on project name
      const projectName = currentSchema.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const filename = `${projectName}.${format.extension}`;

      // Create and download file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Add to export history
      setExportHistory(prev => [{
        timestamp: new Date(),
        format: format.name,
        filename,
        size: formatFileSize(blob.size)
      }, ...prev.slice(0, 9)]); // Keep last 10 exports

    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const generateJSONExport = (): string => {
    const exportData = {
      schema: {
        name: currentSchema.name,
        version: '1.0.0',
        created: new Date().toISOString(),
        tables: currentSchema.tables.map(table => ({
          name: table.name,
          columns: table.columns.map(col => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable,
            primaryKey: col.isPrimaryKey,
            unique: col.isUnique,
            defaultValue: col.defaultValue
          }))
        })),
        relationships: currentSchema.relationships.map(rel => {
          const sourceTable = currentSchema.tables.find(t => t.id === rel.sourceTableId);
          const targetTable = currentSchema.tables.find(t => t.id === rel.targetTableId);
          const sourceColumn = sourceTable?.columns.find(c => c.id === rel.sourceColumnId);
          const targetColumn = targetTable?.columns.find(c => c.id === rel.targetColumnId);
          
          return {
            type: rel.cardinality,
            source: {
              table: sourceTable?.name,
              column: sourceColumn?.name
            },
            target: {
              table: targetTable?.name,
              column: targetColumn?.name
            }
          };
        })
      }
    };

    return JSON.stringify(exportData, null, 2);
  };

  const generateCSVExport = (): string => {
    let csv = 'Table,Column,Type,Nullable,Primary Key,Unique,Default Value\n';
    
    currentSchema.tables.forEach(table => {
      table.columns.forEach(col => {
        csv += `${table.name},${col.name},${col.type},${col.nullable ? 'Yes' : 'No'},${col.isPrimaryKey ? 'Yes' : 'No'},${col.isUnique ? 'Yes' : 'No'},${col.defaultValue || ''}\n`;
      });
    });

    return csv;
  };

  const formatSQLOutput = (sql: string): string => {
    // Basic SQL formatting
    return sql
      .replace(/CREATE TABLE/gi, '\nCREATE TABLE')
      .replace(/ALTER TABLE/gi, '\nALTER TABLE')
      .replace(/INSERT INTO/gi, '\nINSERT INTO')
      .replace(/;/g, ';\n')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Smart Export
        </h3>

        {/* Export Format Selection - Two Column Layout */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {exportFormats.map(format => {
              const isDisabled = format.requiresPro && !canUseFeature('canExportSQL');
              
              return (
                <button
                  key={format.id}
                  onClick={() => !isDisabled && setSelectedFormat(format.id)}
                  disabled={isDisabled}
                  className={`p-3 border-2 rounded-lg text-left transition-all duration-200 ${
                    selectedFormat === format.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : isDisabled
                      ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{format.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {format.name}
                        {format.requiresPro && !canUseFeature('canExportSQL') && (
                          <span className="ml-1 text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-1 rounded">
                            Pro
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedFormat === format.id && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Export Options - Toggle Switches */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Export Options
          </label>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Include sample data</span>
              <input
                type="checkbox"
                checked={exportOptions.includeData}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeData: e.target.checked }))}
                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Include indexes</span>
              <input
                type="checkbox"
                checked={exportOptions.includeIndexes}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeIndexes: e.target.checked }))}
                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Include constraints</span>
              <input
                type="checkbox"
                checked={exportOptions.includeConstraints}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeConstraints: e.target.checked }))}
                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Format output</span>
              <input
                type="checkbox"
                checked={exportOptions.formatOutput}
                onChange={(e) => setExportOptions(prev => ({ ...prev, formatOutput: e.target.checked }))}
                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
              />
            </label>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || currentSchema.tables.length === 0}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 font-medium"
        >
          {isExporting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Export {exportFormats.find(f => f.id === selectedFormat)?.name}
            </>
          )}
        </button>
      </div>

      {/* Export History */}
      <div className="flex-1 overflow-y-auto">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          Recent Exports ({exportHistory.length})
        </h4>
        
        {exportHistory.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No exports yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {exportHistory.map((export_, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {export_.filename}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {export_.format} • {export_.size} • {export_.timestamp.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartExportManager;