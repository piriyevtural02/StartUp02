import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  addEdge,
  NodeProps,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDatabase } from '../../../context/DatabaseContext';
import TableNode from './TableNode';

interface DatabaseCanvasProps {
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
}

const nodeTypes = {
table: TableNode as React.ComponentType<NodeProps>,
};

const DatabaseCanvasInner: React.FC<DatabaseCanvasProps> = ({ 
  zoom, 
  pan, 
  onPanChange, 
  onZoomChange 
}) => {
  const { currentSchema, updateTable, addRelationship } = useDatabase();
  const { setViewport, getViewport } = useReactFlow();

  // Convert database tables to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return currentSchema.tables.map(table => ({
      id: table.id,
      type: 'table',
      position: table.position,
      data: table,
      draggable: true,
    }));
  }, [currentSchema.tables]);

  // Convert database relationships to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    return currentSchema.relationships.map(relationship => ({
      id: relationship.id,
      source: relationship.sourceTableId,
      target: relationship.targetTableId,
      sourceHandle: relationship.sourceColumnId,
      targetHandle: relationship.targetColumnId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 2 },
      label: relationship.cardinality,
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
      labelStyle: { fontSize: 12, fontWeight: 600 },
    }));
  }, [currentSchema.relationships]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when schema changes
  useEffect(() => {
    const newNodes = currentSchema.tables.map(table => ({
      id: table.id,
      type: 'table',
      position: table.position,
      data: table,
      draggable: true,
    }));
    setNodes(newNodes);
  }, [currentSchema.tables, setNodes]);

  // Update edges when relationships change
  useEffect(() => {
    const newEdges = currentSchema.relationships.map(relationship => ({
      id: relationship.id,
      source: relationship.sourceTableId,
      target: relationship.targetTableId,
      sourceHandle: relationship.sourceColumnId,
      targetHandle: relationship.targetColumnId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 2 },
      label: relationship.cardinality,
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
      labelStyle: { fontSize: 12, fontWeight: 600 },
    }));
    setEdges(newEdges);
  }, [currentSchema.relationships, setEdges]);

  // Zoom dəyişikliklərini izləmək
  useEffect(() => {
    const currentViewport = getViewport();
    const newZoomPercentage = Math.round(currentViewport.zoom * 100);
    if (newZoomPercentage !== zoom) {
      onZoomChange(newZoomPercentage);
    }
  }, [getViewport, onZoomChange, zoom]);

  // External zoom dəyişikliklərini tətbiq etmək
  useEffect(() => {
    const currentViewport = getViewport();
    const targetZoom = zoom / 100;
    if (Math.abs(currentViewport.zoom - targetZoom) > 0.01) {
      setViewport({
        x: currentViewport.x,
        y: currentViewport.y,
        zoom: targetZoom,
      });
    }
  }, [zoom, setViewport, getViewport]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && params.sourceHandle && params.targetHandle) {
        // Create relationship and update schema
        addRelationship({
          sourceTableId: params.source,
          sourceColumnId: params.sourceHandle,
          targetTableId: params.target,
          targetColumnId: params.targetHandle,
          cardinality: '1:N',
        });
        
        // Broadcast schema change for real-time collaboration
        if (window.collaborationService) {
          window.collaborationService.sendSchemaChange({
            type: 'relationship_added',
            data: {
              sourceTableId: params.source,
              targetTableId: params.target
            },
            userId: 'current_user',
            timestamp: new Date()
          });
        }
      }
    },
    [addRelationship]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateTable(node.id, { position: node.position });
    },
    [updateTable]
  );

  // Viewport dəyişikliklərini izləmək
  const onMove = useCallback(
    (_event: any, viewport: any) => {
      const newZoomPercentage = Math.round(viewport.zoom * 100);
      onZoomChange(newZoomPercentage);
      onPanChange({ x: viewport.x, y: viewport.y });
    },
    [onZoomChange, onPanChange]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onMove={onMove}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultViewport={{ x: pan.x, y: pan.y, zoom: zoom / 100 }}
        minZoom={0.25}
        maxZoom={2}
      >
        <Controls 
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg [&>button]:border-0 [&>button]:bg-transparent [&>button]:text-gray-600 [&>button]:dark:text-gray-400 [&>button:hover]:bg-gray-100 [&>button:hover]:dark:bg-gray-700"
          position="bottom-right"
          showZoom={false}
          showFitView={true}
          showInteractive={false}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="bg-gray-50 dark:bg-gray-900"
          color="#e5e7eb"
        />
      </ReactFlow>
    </div>
  );
};

const DatabaseCanvas: React.FC<DatabaseCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <DatabaseCanvasInner {...props} />
    </ReactFlowProvider>
  );
};

export default DatabaseCanvas;