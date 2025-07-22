import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Key, Link2, AlertCircle, Save, X, Edit3 } from 'lucide-react';
import { useDatabase, Column, Table } from '../../../context/DatabaseContext';
import { useSubscription } from '../../../context/SubscriptionContext';
import { v4 as uuidv4 } from 'uuid';

interface TableBuilderState {
  name: string;
  columns: Omit<Column, 'id'>[];
  foreignKeys: ForeignKeyDefinition[];
}

interface ForeignKeyDefinition {
  id: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
}

const EnhancedTableBuilder: React.FC = () => {
  const { currentSchema, addTable, updateTable, addRelationship } = useDatabase();
  const { isLimitReached, setShowUpgradeModal, setUpgradeReason } = useSubscription();
  
  const [table, setTable] = useState<TableBuilderState>({
    name: '',
    columns: [],
    foreignKeys: [],
  });
  
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showFKModal, setShowFKModal] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [selectedRefTable, setSelectedRefTable] = useState<string>('');

  const dataTypes = [
    'VARCHAR(255)', 'VARCHAR(100)', 'VARCHAR(50)',
    'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
    'DECIMAL(10,2)', 'DECIMAL(15,4)', 'FLOAT', 'DOUBLE',
    'BOOLEAN', 'BIT',
    'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
    'TEXT', 'LONGTEXT', 'MEDIUMTEXT',
    'JSON', 'BLOB', 'LONGBLOB'
  ];

  // Real-time validation
  useEffect(() => {
    validateTable();
  }, [table, currentSchema.tables]);

  const validateTable = () => {
    const errors: ValidationError[] = [];

    // Table name validation
    if (!table.name.trim()) {
      errors.push({ field: 'name', message: 'Table name is required', type: 'error' });
    } else if (currentSchema.tables.some(t => t.name.toLowerCase() === table.name.toLowerCase() && (!editingTable || t.id !== editingTable.id))) {
      errors.push({ field: 'name', message: 'Table name already exists', type: 'error' });
    }

    // Primary key validation
    const primaryKeys = table.columns.filter(col => col.isPrimaryKey);
    if (primaryKeys.length > 1) {
      errors.push({ field: 'columns', message: 'Only one primary key allowed per table', type: 'error' });
    }

    // Column name validation
    const columnNames = table.columns.map(col => col.name.toLowerCase());
    const duplicateColumns = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
    if (duplicateColumns.length > 0) {
      errors.push({ field: 'columns', message: 'Duplicate column names found', type: 'error' });
    }

    // Foreign key validation
    table.foreignKeys.forEach(fk => {
      const referencedTable = currentSchema.tables.find(t => t.name === fk.referencedTable);
      if (!referencedTable) {
        errors.push({ field: 'foreignKeys', message: `Referenced table '${fk.referencedTable}' not found`, type: 'error' });
      } else if (!referencedTable.columns.some(col => col.name === fk.referencedColumn)) {
        errors.push({ field: 'foreignKeys', message: `Referenced column '${fk.referencedColumn}' not found in table '${fk.referencedTable}'`, type: 'error' });
      }

      if (!table.columns.some(col => col.name === fk.columnName)) {
        errors.push({ field: 'foreignKeys', message: `Foreign key column '${fk.columnName}' not found in current table`, type: 'error' });
      }
    });

    // Circular dependency check
    const checkCircularDependency = (tableName: string, visited: Set<string> = new Set()): boolean => {
      if (visited.has(tableName)) return true;
      visited.add(tableName);

      const tableFKs = table.foreignKeys.filter(fk => fk.referencedTable !== tableName);
      for (const fk of tableFKs) {
        if (checkCircularDependency(fk.referencedTable, new Set(visited))) {
          return true;
        }
      }
      return false;
    };

    if (table.name && checkCircularDependency(table.name)) {
      errors.push({ field: 'foreignKeys', message: 'Circular foreign key dependency detected', type: 'warning' });
    }

    setValidationErrors(errors);
  };

  const addColumn = () => {
    if (isLimitReached('maxColumns', table.columns.length)) {
      setUpgradeReason('You have reached the maximum number of columns for your plan. Upgrade to add more columns.');
      setShowUpgradeModal(true);
      return;
    }
    
    setTable(prev => ({
      ...prev,
      columns: [
        ...prev.columns,
        {
          name: '',
          type: 'VARCHAR(255)',
          nullable: true,
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isIndexed: false
        }
      ]
    }));
  };

  const removeColumn = (index: number) => {
    const columnName = table.columns[index].name;
    setTable(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index),
      foreignKeys: prev.foreignKeys.filter(fk => fk.columnName !== columnName)
    }));
  };

  const updateColumn = (index: number, updates: Partial<Omit<Column, 'id'>>) => {
    setTable(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === index ? { ...col, ...updates } : col
      )
    }));
  };

  const addForeignKey = (refColumn: string) => {
    if (!selectedColumn || !selectedRefTable || !refColumn) return;

    const newFK: ForeignKeyDefinition = {
      id: uuidv4(),
      columnName: selectedColumn,
      referencedTable: selectedRefTable,
      referencedColumn: refColumn,
      constraintName: `fk_${table.name}_${selectedColumn}`
    };

    setTable(prev => ({
      ...prev,
      foreignKeys: [...prev.foreignKeys, newFK]
    }));

    setShowFKModal(false);
    setSelectedColumn('');
    setSelectedRefTable('');
  };

  const removeForeignKey = (fkId: string) => {
    setTable(prev => ({
      ...prev,
      foreignKeys: prev.foreignKeys.filter(fk => fk.id !== fkId)
    }));
  };

  const handleCreateOrUpdateTable = () => {
    if (validationErrors.some(e => e.type === 'error')) return;

    const tableData = {
      name: table.name,
      columns: table.columns.map(col => ({ 
        ...col, 
        id: uuidv4(),
        isForeignKey: table.foreignKeys.some(fk => fk.columnName === col.name)
      })),
      position: editingTable?.position || { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 }
    };

    if (editingTable) {
      updateTable(editingTable.id, tableData);
    } else {
      addTable(tableData);
    }

    // Add relationships for foreign keys
    table.foreignKeys.forEach(fk => {
      const sourceColumn = tableData.columns.find(col => col.name === fk.columnName);
      const targetTable = currentSchema.tables.find(t => t.name === fk.referencedTable);
      const targetColumn = targetTable?.columns.find(col => col.name === fk.referencedColumn);

      if (sourceColumn && targetTable && targetColumn) {
        addRelationship({
          sourceTableId: editingTable?.id || 'new-table-id',
          sourceColumnId: sourceColumn.id,
          targetTableId: targetTable.id,
          targetColumnId: targetColumn.id,
          cardinality: '1:N'
        });
      }
    });

    resetForm();
  };

  const resetForm = () => {
    setTable({ name: '', columns: [], foreignKeys: [] });
    setEditingTable(null);
    setValidationErrors([]);
  };

  const getAvailableReferenceTables = () => {
    return currentSchema.tables.filter(t => t.name !== table.name);
  };

  const getAvailableColumns = (tableName: string) => {
    const refTable = currentSchema.tables.find(t => t.name === tableName);
    return refTable?.columns || [];
  };

  const hasErrors = validationErrors.some(e => e.type === 'error');

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingTable ? 'Edit Table' : 'Create Table'}
          </h3>
          {editingTable && (
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
              Cancel Edit
            </button>
          )}
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 space-y-2">
            {validationErrors.map((error, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  error.type === 'error' 
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{error.message}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Table Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Table Name *
          </label>
          <input
            type="text"
            value={table.name}
            onChange={(e) => setTable(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
              validationErrors.some(e => e.field === 'name') 
                ? 'border-red-300 dark:border-red-600' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter table name"
          />
        </div>

        {/* Columns Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Columns
            </label>
            <button
              onClick={addColumn}
              className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Column
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {table.columns.map((column, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Column {index + 1}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedColumn(column.name);
                        setShowFKModal(true);
                      }}
                      disabled={!column.name}
                      className="flex items-center gap-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-xs transition-colors duration-200"
                    >
                      <Link2 className="w-3 h-3" />
                      FK
                    </button>
                    <button
                      onClick={() => removeColumn(index)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={column.name}
                    onChange={(e) => updateColumn(index, { name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Column name"
                  />

                  <select
                    value={column.type}
                    onChange={(e) => updateColumn(index, { type: e.target.value })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    {dataTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={column.defaultValue || ''}
                    onChange={(e) => updateColumn(index, { defaultValue: e.target.value })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Default value (optional)"
                  />

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!column.nullable}
                        onChange={(e) => updateColumn(index, { nullable: !e.target.checked })}
                        className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Not Null</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={column.isPrimaryKey || false}
                        onChange={(e) => updateColumn(index, { isPrimaryKey: e.target.checked })}
                        className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                      />
                      <Key className="w-4 h-4 text-yellow-500" />
                      <span className="text-gray-700 dark:text-gray-300">Primary Key</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={column.isUnique || false}
                        onChange={(e) => updateColumn(index, { isUnique: e.target.checked })}
                        className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Unique</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Foreign Keys Section */}
        {table.foreignKeys.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Foreign Key Constraints
            </h4>
            <div className="space-y-3">
              {table.foreignKeys.map(fk => (
                <div key={fk.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex-1">
                    <div className="font-mono text-sm text-blue-800 dark:text-blue-200">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {fk.constraintName}
                      </span>
                      : {table.name}({fk.columnName}) → {fk.referencedTable}({fk.referencedColumn})
                    </div>
                  </div>
                  <button
                    onClick={() => removeForeignKey(fk.id)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCreateOrUpdateTable}
            disabled={hasErrors || !table.name.trim() || table.columns.length === 0}
            className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            <Save className="w-4 h-4" />
            {editingTable ? 'Update Table' : 'Create Table'}
          </button>
          
          {editingTable && (
            <button
              onClick={resetForm}
              className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Foreign Key Modal - Centered */}
      {showFKModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Foreign Key for "{selectedColumn}"
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reference Table
                </label>
                <select
                  value={selectedRefTable}
                  onChange={(e) => setSelectedRefTable(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select reference table</option>
                  {getAvailableReferenceTables().map(refTable => (
                    <option key={refTable.id} value={refTable.name}>
                      {refTable.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRefTable && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reference Column
                  </label>
                  <select
                    onChange={(e) => e.target.value && addForeignKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="">Select reference column</option>
                    {getAvailableColumns(selectedRefTable).map(col => (
                      <option key={col.id} value={col.name}>
                        {col.name} ({col.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowFKModal(false);
                  setSelectedColumn('');
                  setSelectedRefTable('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTableBuilder;