import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
// @ts-ignore: module has no type declarations
import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import {mongoService} from '../services/mongoService'

export interface Column {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencedTable?: string;
  referencedColumn?: string;
  isUnique?: boolean;
  isIndexed?: boolean;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
  rowCount: number;
  data: Record<string, any>[];
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  cardinality: '1:1' | '1:N' | 'N:M';
}

export interface Index {
  id: string;
  name: string;
  tableId: string;
  columns: string[];
  isUnique: boolean;
}

export interface Constraint {
  id: string;
  name: string;
  type: 'CHECK' | 'UNIQUE' | 'NOT_NULL';
  tableId: string;
  columnId?: string;
  expression?: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
}

export interface Permission {
  id: string;
  userId: string;
  tableId: string;
  permissions: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[];
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  tables: string[];
  joins: any[];
  filters: any[];
  columns: string[];
  aggregates: any[];
  createdAt: Date;
}

// Enhanced workspace sharing interfaces for team collaboration
export interface WorkspaceMember {
  id: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  inviterUsername: string;
  inviteeUsername: string;
  role: 'editor' | 'viewer';
  joinCode: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
}

export interface Schema {
  id: string;
  name: string;
  tables: Table[];
  relationships: Relationship[];
  indexes: Index[];
  constraints: Constraint[];
  users: User[];
  permissions: Permission[];
  savedQueries: SavedQuery[];
  // Enhanced team collaboration fields
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  isShared: boolean;
  ownerId: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseContextType {
  currentSchema: Schema;
  schemas: Schema[];
  sqlEngine: any;
  importSchema: (schema: Schema) => void;
  // Table operations
  addTable: (table: Omit<Table, 'id' | 'rowCount' | 'data'>) => void;
  removeTable: (tableId: string) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  alterTable: (tableId: string, operation: 'ADD_COLUMN' | 'DROP_COLUMN' | 'MODIFY_COLUMN', data: any) => void;
  duplicateTable: (tableId: string) => void;
  
  // Data operations
  insertRow: (tableId: string, data: Record<string, any>) => void;
  updateRow: (tableId: string, rowIndex: number, data: Record<string, any>) => void;
  deleteRow: (tableId: string, rowIndex: number) => void;
  truncateTable: (tableId: string) => void;
  
  // Relationship operations
  addRelationship: (relationship: Omit<Relationship, 'id'>) => void;
  removeRelationship: (relationshipId: string) => void;
  
  // Index and constraint operations
  addIndex: (index: Omit<Index, 'id'>) => void;
  removeIndex: (indexId: string) => void;
  addConstraint: (constraint: Omit<Constraint, 'id'>) => void;
  removeConstraint: (constraintId: string) => void;
  
  // Security operations
  addUser: (user: Omit<User, 'id'>) => void;
  removeUser: (userId: string) => void;
  grantPermission: (permission: Omit<Permission, 'id'>) => void;
  revokePermission: (permissionId: string) => void;
  
  // Enhanced team collaboration operations with MongoDB integration
//  inviteToWorkspace: (invitation: Omit<WorkspaceInvitation, 'id' | 'workspaceId' | 'createdAt' | 'expiresAt' | 'status'>) => Promise<string>;
  acceptWorkspaceInvitation: (joinCode: string) => Promise<boolean>;
  removeWorkspaceMember: (memberId: string) => void;
  validateUsername: (username: string) => Promise<boolean>;
  syncWorkspaceWithMongoDB: () => Promise<void>;
  
  // Query operations
  executeVisualQuery: (query: any) => Promise<any>;
  executeSQL: (sql: string) => Promise<any>;
  saveQuery: (query: Omit<SavedQuery, 'id' | 'createdAt'>) => void;
  removeQuery: (queryId: string) => void;
  
  // Export operations
  exportSchema: (format: string) => string;
  
  // Schema management
  createNewSchema: (name: string) => void;
  loadSchema: (schemaId: string) => void;
  saveSchema: () => void;
  
  // SQL preview
  generateSQL: () => string;
  inviteToWorkspace: (invitation: Omit<WorkspaceInvitation, 'id'|'workspaceId'|'createdAt'|'expiresAt'|'status'|'joinCode'>) => Promise<string>;

}  

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [sqlEngine, setSqlEngine] = useState<any>(null);
  const [currentSchema, setCurrentSchema] = useState<Schema>({
    id: uuidv4(),
    name: 'Untitled Schema',
    tables: [],
    relationships: [],
    indexes: [],
    constraints: [],
    users: [],
    permissions: [],
    savedQueries: [],
    // Enhanced team collaboration fields with default owner
    members: [
      {
        id: uuidv4(),
        username: 'current_user', // In real app, get from auth context
        role: 'owner',
        joinedAt: new Date()
      }
    ],
    invitations: [],
    isShared: false,
    ownerId: 'current_user', // In real app, get from auth context
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [schemas, setSchemas] = useState<Schema[]>([]);
 
  // Initialize SQL.js
  useEffect(() => {
    const initSQL = async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`
        });
        const db = new SQL.Database();
        setSqlEngine(db);
      } catch (error) {
        console.error('Failed to initialize SQL.js:', error);
      }
    };
    
    initSQL();
  }, []);
  const importSchema = useCallback((schema: Schema) => {
    setCurrentSchema(schema);
  }, []);
  // Enhanced team collaboration functions with MongoDB integration
  const validateUsername = useCallback(async (username: string): Promise<boolean> => {
    return await mongoService.validateUsername(username);
  }, []);

  const inviteToWorkspace = useCallback(async (
    invitation: Omit<WorkspaceInvitation, 'id' | 'workspaceId' | 'createdAt' | 'expiresAt' | 'status'| 'joinCode'>
  ): Promise<string> => {
    console.log('inviteToWorkspace called with:', invitation);
    
    // Generate secure join code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let joinCode = '';
    for (let i = 0; i < 8; i++) {
      joinCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    console.log('Generated join code:', joinCode);

    const newInvitation: WorkspaceInvitation = {
      ...invitation,
      id: uuidv4(),
      workspaceId: currentSchema.id,
      joinCode,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      status: 'pending'
    };
    
    console.log('Created invitation object:', newInvitation);

    // Update local state
    setCurrentSchema(prev => ({
      ...prev,
      invitations: [...prev.invitations, newInvitation],
      updatedAt: new Date()
    }));

    console.log('Updated local schema with invitation');
    
    // Save to MongoDB (optional - can be done later)
    try {
      // await mongoService.saveInvitation(newInvitation);
      console.log('Skipping MongoDB save for now');
    } catch (error) {
      console.error('Failed to save invitation to MongoDB:', error);
    }
    
    console.log('Returning join code:', joinCode);

    return joinCode;
  }, [currentSchema.id]);

  const acceptWorkspaceInvitation = useCallback(async (joinCode: string): Promise<boolean> => {
    console.log('Attempting to accept invitation with code:', joinCode);
    
    try {
      // First validate the join code with MongoDB
      const validation = await mongoService.validateJoinCode(joinCode);
      
      if (!validation.valid || !validation.invitation) {
        console.error('Join code validation failed:', validation.error);
        return false;
      }
      
      const invitation = validation.invitation;
      console.log('Valid invitation found:', invitation);
      
      // Check if user is already a member
      const existingMember = currentSchema.members.find(
        member => member.username.toLowerCase() === invitation.inviteeUsername.toLowerCase()
      );
      
      if (existingMember) {
        console.error('User is already a member');
        return false;
      }
      
      // Update local state - mark invitation as accepted
      setCurrentSchema(prev => ({
        ...prev,
        invitations: prev.invitations.map(inv =>
          inv.joinCode === joinCode.toUpperCase() 
            ? { ...inv, status: 'accepted' as const }
            : inv
        ),
        updatedAt: new Date()
      }));
      
      // Add new member to local state
      const newMember: WorkspaceMember = {
        id: uuidv4(),
        username: invitation.inviteeUsername,
        role: invitation.role,
        joinedAt: new Date()
      };
      
      setCurrentSchema(prev => ({
        ...prev,
        members: [...prev.members, newMember],
        isShared: true,
        updatedAt: new Date()
      }));
      
      console.log('Local state updated successfully');
      return true;
      
    } catch (error) {
      console.error('Error accepting workspace invitation:', error);
      return false;
    }
  }, [currentSchema.members]);

  // Original implementation as fallback
  const acceptWorkspaceInvitationFallback = useCallback(async (joinCode: string): Promise<boolean> => {
    // Find invitation by join code and check if it's still valid
    const invitation = currentSchema.invitations.find(inv => 
      inv.joinCode === joinCode.toUpperCase() && 
      inv.status === 'pending' && 
      new Date() <= inv.expiresAt
    );

    if (!invitation) {
      return false;
    }

    // Mark invitation as accepted
    setCurrentSchema(prev => ({
      ...prev,
      invitations: prev.invitations.map(inv =>
        inv.joinCode === joinCode.toUpperCase() 
          ? { ...inv, status: 'accepted' as const }
          : inv
      ),
      updatedAt: new Date()
    }));

    // Add member to workspace
    const newMember: WorkspaceMember = {
      id: uuidv4(),
      username: invitation.inviteeUsername,
      role: invitation.role,
      joinedAt: new Date()
    };

    // Add new member to workspace
    setCurrentSchema(prev => ({
      ...prev,
      members: [...prev.members, newMember],
      isShared: true,
      updatedAt: new Date()
    }));


    return true;
  }, [currentSchema.invitations]);

  const removeWorkspaceMember = useCallback((memberId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      members: prev.members.filter(member => member.id !== memberId),
      updatedAt: new Date()
    }));
  }, []);

  // Enhanced workspace sync with MongoDB
  const syncWorkspaceWithMongoDB = useCallback(async () => {
    try {
      // Update workspace data in MongoDB
      await mongoService.updateWorkspace(currentSchema.id, {
        schema: currentSchema,
        lastSyncedAt: new Date()
      });
      
      setCurrentSchema(prev => ({
        ...prev,
        lastSyncedAt: new Date()
      }));
    } catch (error) {
      console.error('Failed to sync workspace with MongoDB:', error);
    }
  }, [currentSchema]);

  // Auto-sync workspace changes for shared workspaces
  useEffect(() => {
    if (currentSchema.isShared) {
      const syncInterval = setInterval(() => {
        syncWorkspaceWithMongoDB();
      }, 30000); // Sync every 30 seconds

      return () => clearInterval(syncInterval);
    }
  }, [currentSchema.isShared, syncWorkspaceWithMongoDB]);

  const addTable = useCallback((table: Omit<Table, 'id' | 'rowCount' | 'data'>) => {
    const newTable: Table = {
      ...table,
      id: uuidv4(),
      rowCount: 0,
      data: [],
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      tables: [...prev.tables, newTable],
      updatedAt: new Date(),
    }));

    // Broadcast schema change for real-time collaboration
    if (window.collaborationService) {
      window.collaborationService.sendSchemaChange({
        type: 'table_created',
        data: { table: newTable },
        userId: 'current_user',
        timestamp: new Date()
      });
    }
    // Create table in SQL engine
    if (sqlEngine) {
      const columnDefs = newTable.columns.map(col => {
        let def = `${col.name} ${col.type}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
        if (col.isPrimaryKey) def += ' PRIMARY KEY';
        return def;
      }).join(', ');
      
      const createSQL = `CREATE TABLE ${newTable.name} (${columnDefs})`;
      try {
        sqlEngine.run(createSQL);
      } catch (error) {
        console.error('Failed to create table in SQL engine:', error);
      }
    }
  }, [sqlEngine]);

  const removeTable = useCallback((tableId: string) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table) return;

    // Broadcast schema change for real-time collaboration
    if (window.collaborationService) {
      window.collaborationService.sendSchemaChange({
        type: 'table_deleted',
        data: { tableId, tableName: table.name },
        userId: 'current_user',
        timestamp: new Date()
      });
    }
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.filter(table => table.id !== tableId),
      relationships: prev.relationships.filter(
        rel => rel.sourceTableId !== tableId && rel.targetTableId !== tableId
      ),
      indexes: prev.indexes.filter(idx => idx.tableId !== tableId),
      constraints: prev.constraints.filter(con => con.tableId !== tableId),
      permissions: prev.permissions.filter(perm => perm.tableId !== tableId),
      updatedAt: new Date(),
    }));

    // Drop table in SQL engine
    if (sqlEngine) {
      try {
        sqlEngine.run(`DROP TABLE IF EXISTS ${table.name}`);
      } catch (error) {
        console.error('Failed to drop table in SQL engine:', error);
      }
    }
  }, [currentSchema.tables, sqlEngine]);

  const updateTable = useCallback((tableId: string, updates: Partial<Table>) => {
    // Broadcast schema change for real-time collaboration
    if (window.collaborationService) {
      window.collaborationService.sendSchemaChange({
        type: 'table_updated',
        data: { tableId, updates },
        userId: 'current_user',
        timestamp: new Date()
      });
    }
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table =>
        table.id === tableId ? { ...table, ...updates } : table
      ),
      updatedAt: new Date(),
    }));
  }, []);

  const duplicateTable = useCallback((tableId: string) => {
    const originalTable = currentSchema.tables.find(t => t.id === tableId);
    if (!originalTable) return;

    const newTable: Table = {
      id: uuidv4(),
      name: `${originalTable.name}_copy`,
      columns: originalTable.columns.map(col => ({ ...col, id: uuidv4() })),
      position: { 
        x: originalTable.position.x + 50, 
        y: originalTable.position.y + 50 
      },
      rowCount: 0,
      data: []
    };

    setCurrentSchema(prev => ({
      ...prev,
      tables: [...prev.tables, newTable],
      updatedAt: new Date(),
    }));

    // Create table in SQL engine
    if (sqlEngine) {
      const columnDefs = newTable.columns.map(col => {
        let def = `${col.name} ${col.type}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
        if (col.isPrimaryKey) def += ' PRIMARY KEY';
        return def;
      }).join(', ');
      
      const createSQL = `CREATE TABLE ${newTable.name} (${columnDefs})`;
      try {
        sqlEngine.run(createSQL);
      } catch (error) {
        console.error('Failed to create duplicated table in SQL engine:', error);
      }
    }
  }, [currentSchema.tables, sqlEngine]);

  const alterTable = useCallback((tableId: string, operation: 'ADD_COLUMN' | 'DROP_COLUMN' | 'MODIFY_COLUMN', data: any) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table) return;

    let newColumns = [...table.columns];
    let alterSQL = '';

    switch (operation) {
      case 'ADD_COLUMN':
        const newColumn: Column = { ...data, id: uuidv4() };
        newColumns.push(newColumn);
        alterSQL = `ALTER TABLE ${table.name} ADD COLUMN ${newColumn.name} ${newColumn.type}`;
        if (!newColumn.nullable) alterSQL += ' NOT NULL';
        if (newColumn.defaultValue) alterSQL += ` DEFAULT '${newColumn.defaultValue}'`;
        break;
      
      case 'DROP_COLUMN':
        newColumns = newColumns.filter(col => col.id !== data.columnId);
        const columnToDrop = table.columns.find(col => col.id === data.columnId);
        if (columnToDrop) {
          alterSQL = `ALTER TABLE ${table.name} DROP COLUMN ${columnToDrop.name}`;
        }
        break;
      
      case 'MODIFY_COLUMN':
        newColumns = newColumns.map(col => 
          col.id === data.columnId ? { ...col, ...data.updates } : col
        );
        const modifiedColumn = newColumns.find(col => col.id === data.columnId);
        if (modifiedColumn) {
          alterSQL = `ALTER TABLE ${table.name} MODIFY COLUMN ${modifiedColumn.name} ${modifiedColumn.type}`;
        }
        break;
    }

    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId ? { ...t, columns: newColumns } : t
      ),
      updatedAt: new Date(),
    }));

    // Execute ALTER in SQL engine
    if (sqlEngine && alterSQL) {
      try {
        sqlEngine.run(alterSQL);
      } catch (error) {
        console.error('Failed to alter table in SQL engine:', error);
      }
    }
  }, [currentSchema.tables, sqlEngine]);

  const insertRow = useCallback((tableId: string, data: Record<string, any>) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table) return;

    const newData = [...table.data, data];
    
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId 
          ? { ...t, data: newData, rowCount: newData.length }
          : t
      ),
      updatedAt: new Date(),
    }));

    // Insert into SQL engine
    if (sqlEngine) {
      const columns = Object.keys(data).join(', ');
      const values = Object.values(data).map(v => `'${v}'`).join(', ');
      const insertSQL = `INSERT INTO ${table.name} (${columns}) VALUES (${values})`;
      
      try {
        sqlEngine.run(insertSQL);
      } catch (error) {
        console.error('Failed to insert row in SQL engine:', error);
      }
    }
  }, [currentSchema.tables, sqlEngine]);

  const updateRow = useCallback((tableId: string, rowIndex: number, data: Record<string, any>) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table || rowIndex >= table.data.length) return;

    const newData = [...table.data];
    newData[rowIndex] = { ...newData[rowIndex], ...data };
    
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId ? { ...t, data: newData } : t
      ),
      updatedAt: new Date(),
    }));
  }, [currentSchema.tables]);

  const deleteRow = useCallback((tableId: string, rowIndex: number) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table || rowIndex >= table.data.length) return;

    const newData = table.data.filter((_, index) => index !== rowIndex);
    
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId 
          ? { ...t, data: newData, rowCount: newData.length }
          : t
      ),
      updatedAt: new Date(),
    }));
  }, [currentSchema.tables]);

  const truncateTable = useCallback((tableId: string) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table) return;

    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId ? { ...t, data: [], rowCount: 0 } : t
      ),
      updatedAt: new Date(),
    }));

    // Truncate in SQL engine
    if (sqlEngine) {
      try {
        sqlEngine.run(`DELETE FROM ${table.name}`);
      } catch (error) {
        console.error('Failed to truncate table in SQL engine:', error);
      }
    }
  }, [currentSchema.tables, sqlEngine]);

  const addRelationship = useCallback((relationship: Omit<Relationship, 'id'>) => {
    const newRelationship: Relationship = {
      ...relationship,
      id: uuidv4(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      relationships: [...prev.relationships, newRelationship],
      updatedAt: new Date(),
    }));
  }, []);

  const removeRelationship = useCallback((relationshipId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      relationships: prev.relationships.filter(rel => rel.id !== relationshipId),
      updatedAt: new Date(),
    }));
  }, []);

  const addIndex = useCallback((index: Omit<Index, 'id'>) => {
    const newIndex: Index = {
      ...index,
      id: uuidv4(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      indexes: [...prev.indexes, newIndex],
      updatedAt: new Date(),
    }));
  }, []);

  const removeIndex = useCallback((indexId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      indexes: prev.indexes.filter(idx => idx.id !== indexId),
      updatedAt: new Date(),
    }));
  }, []);

  const addConstraint = useCallback((constraint: Omit<Constraint, 'id'>) => {
    const newConstraint: Constraint = {
      ...constraint,
      id: uuidv4(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      constraints: [...prev.constraints, newConstraint],
      updatedAt: new Date(),
    }));
  }, []);

  const removeConstraint = useCallback((constraintId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      constraints: prev.constraints.filter(con => con.id !== constraintId),
      updatedAt: new Date(),
    }));
  }, []);

  const addUser = useCallback((user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: uuidv4(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      users: [...prev.users, newUser],
      updatedAt: new Date(),
    }));
  }, []);

  const removeUser = useCallback((userId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      users: prev.users.filter(user => user.id !== userId),
      permissions: prev.permissions.filter(perm => perm.userId !== userId),
      updatedAt: new Date(),
    }));
  }, []);

  const grantPermission = useCallback((permission: Omit<Permission, 'id'>) => {
    const newPermission: Permission = {
      ...permission,
      id: uuidv4(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      permissions: [...prev.permissions, newPermission],
      updatedAt: new Date(),
    }));
  }, []);

  const revokePermission = useCallback((permissionId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      permissions: prev.permissions.filter(perm => perm.id !== permissionId),
      updatedAt: new Date(),
    }));
  }, []);

  const executeVisualQuery = useCallback(async (query: any) => {
    if (!sqlEngine) return { columns: [], values: [] };

    try {
      // Build SQL from visual query
      let sql = 'SELECT ';
      sql += query.columns.length > 0 ? query.columns.join(', ') : '*';
      sql += ` FROM ${query.tables.join(', ')}`;
      
      if (query.joins && query.joins.length > 0) {
        query.joins.forEach((join: any) => {
          sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
        });
      }
      
      if (query.filters && query.filters.length > 0) {
        sql += ' WHERE ' + query.filters.map((f: any) => `${f.column} ${f.operator} '${f.value}'`).join(' AND ');
      }
      
      if (query.groupBy && query.groupBy.length > 0) {
        sql += ` GROUP BY ${query.groupBy.join(', ')}`;
      }
      
      if (query.orderBy && query.orderBy.length > 0) {
        sql += ` ORDER BY ${query.orderBy.map((o: any) => `${o.column} ${o.direction}`).join(', ')}`;
      }

      const result = sqlEngine.exec(sql);
      return result.length > 0 ? result[0] : { columns: [], values: [] };
    } catch (e) {
      const error = e as Error
      console.error('Query execution failed:', error);
      return { columns: [], values: [], error: error.message };
    }
  }, [sqlEngine]);

  const executeSQL = useCallback(async (sql: string) => {
    if (!sqlEngine) return { columns: [], values: [] };

    try {
      const result = sqlEngine.exec(sql);
      return result.length > 0 ? result[0] : { columns: [], values: [] };
    } catch (e) {
      const error = e as Error;
      console.error('SQL execution failed:', error);
      throw new Error(error.message);
    }
  }, [sqlEngine]);

  const saveQuery = useCallback((query: Omit<SavedQuery, 'id' | 'createdAt'>) => {
    const newQuery: SavedQuery = {
      ...query,
      id: uuidv4(),
      createdAt: new Date(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      savedQueries: [...prev.savedQueries, newQuery],
      updatedAt: new Date(),
    }));
  }, []);

  const removeQuery = useCallback((queryId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      savedQueries: prev.savedQueries.filter(q => q.id !== queryId),
      updatedAt: new Date(),
    }));
  }, []);

  const exportSchema = useCallback((format: string) => {
    const { tables, relationships, indexes, constraints, users, permissions } = currentSchema;
    
    let script = '';
    
    switch (format.toLowerCase()) {
      case 'mysql':
        script = generateMySQLScript(tables, relationships, indexes, constraints, users, permissions);
        break;
      case 'postgresql':
        script = generatePostgreSQLScript(tables, relationships, indexes, constraints, users, permissions);
        break;
      case 'sqlserver':
        script = generateSQLServerScript(tables, relationships, indexes, constraints, users, permissions);
        break;
      case 'oracle':
        script = generateOracleScript(tables, relationships, indexes, constraints, users, permissions);
        break;
      case 'mongodb':
        script = generateMongoDBScript(tables);
        break;
      default:
        script = generateMySQLScript(tables, relationships, indexes, constraints, users, permissions);
    }
    
    return script;
  }, [currentSchema]);

  const generateSQL = useCallback(() => {
    return exportSchema('mysql');
  }, [exportSchema]);

  const createNewSchema = useCallback((name: string) => {
    const newSchema: Schema = {
      id: uuidv4(),
      name,
      tables: [],
      relationships: [],
      indexes: [],
      constraints: [],
      users: [],
      permissions: [],
      savedQueries: [],
      // Enhanced team collaboration fields with default owner
      members: [
        {
          id: uuidv4(),
          username: 'current_user', // In real app, get from auth context
          role: 'owner',
          joinedAt: new Date()
        }
      ],
      invitations: [],
      isShared: false,
      ownerId: 'current_user', // In real app, get from auth context
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setCurrentSchema(newSchema);
    setSchemas(prev => [...prev, newSchema]);
  }, []);

  const loadSchema = useCallback((schemaId: string) => {
    const schema = schemas.find(s => s.id === schemaId);
    if (schema) {
      setCurrentSchema(schema);
    }
  }, [schemas]);

  const saveSchema = useCallback(() => {
    setSchemas(prev => {
      const existingIndex = prev.findIndex(s => s.id === currentSchema.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = currentSchema;
        return updated;
      }
      return [...prev, currentSchema];
    });
    
  },
 
  [currentSchema]);

  const value: DatabaseContextType = {
    currentSchema,
    schemas,
    sqlEngine,
    importSchema,
    addTable,
    removeTable,
    updateTable,
    alterTable,
    duplicateTable,
    
    insertRow,
    updateRow,
    deleteRow,
    truncateTable,
    addRelationship,
    removeRelationship,
    addIndex,
    removeIndex,
    addConstraint,
    removeConstraint,
    addUser,
    removeUser,
    grantPermission,
    revokePermission,
    // Enhanced team collaboration functions
    inviteToWorkspace,
    acceptWorkspaceInvitation,
    removeWorkspaceMember,
    validateUsername,
    syncWorkspaceWithMongoDB,
    executeVisualQuery,
    executeSQL,
    saveQuery,
    removeQuery,
    exportSchema,
    createNewSchema,
    loadSchema,
    saveSchema,
    generateSQL,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

// SQL generation functions (keeping existing implementations)
function generateMySQLScript(tables: Table[], relationships: Relationship[], indexes: Index[], _constraints: Constraint[], users: User[], permissions: Permission[]): string {
  let script = '-- MySQL Database Schema\n-- Generated by Database Creator\n\n';
  
  // Create tables
  tables.forEach(table => {
    script += `CREATE TABLE \`${table.name}\` (\n`;
    const columnDefs = table.columns.map(col => {
      let def = `  \`${col.name}\` ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
      if (col.isPrimaryKey) def += ' PRIMARY KEY';
      if (col.isUnique) def += ' UNIQUE';
      return def;
    });
    script += columnDefs.join(',\n') + '\n';
    script += ');\n\n';
  });
  
  // Create indexes
  indexes.forEach(index => {
    const table = tables.find(t => t.id === index.tableId);
    if (table) {
      const uniqueStr = index.isUnique ? 'UNIQUE ' : '';
      script += `CREATE ${uniqueStr}INDEX \`${index.name}\` ON \`${table.name}\` (${index.columns.map(c => `\`${c}\``).join(', ')});\n`;
    }
  });
  
  if (indexes.length > 0) script += '\n';
  
  // Create foreign keys
  relationships.forEach(rel => {
    const sourceTable = tables.find(t => t.id === rel.sourceTableId);
    const targetTable = tables.find(t => t.id === rel.targetTableId);
    const sourceColumn = sourceTable?.columns.find(c => c.id === rel.sourceColumnId);
    const targetColumn = targetTable?.columns.find(c => c.id === rel.targetColumnId);
    
    if (sourceTable && targetTable && sourceColumn && targetColumn) {
      script += `ALTER TABLE \`${sourceTable.name}\` ADD FOREIGN KEY (\`${sourceColumn.name}\`) REFERENCES \`${targetTable.name}\`(\`${targetColumn.name}\`);\n`;
    }
  });
  
  if (relationships.length > 0) script += '\n';
  
  // Create users and permissions
  users.forEach(user => {
    script += `CREATE USER '${user.name}'@'localhost';\n`;
  });
  
  permissions.forEach(perm => {
    const user = users.find(u => u.id === perm.userId);
    const table = tables.find(t => t.id === perm.tableId);
    if (user && table) {
      const perms = perm.permissions.join(', ');
      script += `GRANT ${perms} ON \`${table.name}\` TO '${user.name}'@'localhost';\n`;
    }
  });
  
  return script;
}

function generatePostgreSQLScript(tables: Table[], _relationships: Relationship[], _indexes: Index[], _constraints: Constraint[], _users: User[], _permissions: Permission[]): string {
  let script = '-- PostgreSQL Database Schema\n-- Generated by Database Creator\n\n';
  
  tables.forEach(table => {
    script += `CREATE TABLE "${table.name}" (\n`;
    const columnDefs = table.columns.map(col => {
      let def = `  "${col.name}" ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
      if (col.isPrimaryKey) def += ' PRIMARY KEY';
      if (col.isUnique) def += ' UNIQUE';
      return def;
    });
    script += columnDefs.join(',\n') + '\n';
    script += ');\n\n';
  });
  
  return script;
}

function generateSQLServerScript(tables: Table[], _relationships: Relationship[], _indexes: Index[], _constraints: Constraint[], _users: User[], _permissions: Permission[]): string {
  let script = '-- SQL Server Database Schema\n-- Generated by Database Creator\n\n';
  
  tables.forEach(table => {
    script += `CREATE TABLE [${table.name}] (\n`;
    const columnDefs = table.columns.map(col => {
      let def = `  [${col.name}] ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
      if (col.isPrimaryKey) def += ' PRIMARY KEY';
      if (col.isUnique) def += ' UNIQUE';
      return def;
    });
    script += columnDefs.join(',\n') + '\n';
    script += ');\n\n';
  });
  
  return script;
}

function generateOracleScript(tables: Table[], _relationships: Relationship[], _indexes: Index[], _constraints: Constraint[], _users: User[], _permissions: Permission[]): string {
  let script = '-- Oracle Database Schema\n-- Generated by Database Creator\n\n';
  
  tables.forEach(table => {
    script += `CREATE TABLE ${table.name} (\n`;
    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
      return def;
    });
    script += columnDefs.join(',\n') + '\n';
    script += ');\n\n';
  });
  
  return script;
}

function generateMongoDBScript(tables: Table[]): string {
  let script = '// MongoDB Collection Schema\n// Generated by Database Creator\n\n';
  
  tables.forEach(table => {
    script += `// Collection: ${table.name}\n`;
    script += `db.createCollection("${table.name}");\n\n`;
    
    const schema = {
      $jsonSchema: {
        bsonType: "object",
        required: table.columns.filter(col => !col.nullable).map(col => col.name),
        properties: {}
      }
    };
    
    table.columns.forEach(col => {
      schema.$jsonSchema.properties[col.name] = {
        bsonType: col.type === 'INT' ? 'int' : 'string',
        description: `${col.name} field`
      };
    });
    
    script += `db.runCommand({\n`;
    script += `  collMod: "${table.name}",\n`;
    script += `  validator: ${JSON.stringify(schema, null, 2)}\n`;
    script += `});\n\n`;
  });
  
  return script;
}