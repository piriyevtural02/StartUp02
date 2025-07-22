const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class CollaborationServer {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8080 });
    this.rooms = new Map(); // schemaId -> Set of connections
    this.userConnections = new Map(); // userId -> connection
    
    this.setupServer();
  }

  setupServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Failed to parse message:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log('Collaboration WebSocket server running on port 8080');
  }

  handleMessage(ws, data) {
    switch (data.type) {
      case 'user_join':
        this.handleUserJoin(ws, data);
        break;
      case 'schema_change':
        this.handleSchemaChange(ws, data);
        break;
      case 'schema_shared':
        this.handleSchemaShared(ws, data);
        break;
      case 'access_revoked':
        this.handleAccessRevoked(ws, data);
        break;
      case 'cursor_update':
        this.handleCursorUpdate(ws, data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  handleUserJoin(ws, data) {
    const { userId, schemaId } = data;
    
    // Add connection to room
    if (!this.rooms.has(schemaId)) {
      this.rooms.set(schemaId, new Set());
    }
    this.rooms.get(schemaId).add(ws);
    
    // Store user connection
    this.userConnections.set(userId, ws);
    ws.userId = userId;
    ws.schemaId = schemaId;

    // Notify other users in the room
    this.broadcastToRoom(schemaId, {
      type: 'user_joined',
      data: { userId, username: data.username }
    }, ws);

    console.log(`User ${userId} joined schema ${schemaId}`);
  }

  handleSchemaChange(ws, data) {
    const { schemaId } = ws;
    if (!schemaId) return;

    // Broadcast schema change to all users in the room
    this.broadcastToRoom(schemaId, {
      type: 'schema_change',
      data: data.data
    }, ws);

    console.log(`Schema change in ${schemaId}:`, data.data.type);
  }

  handleSchemaShared(ws, data) {
    const { inviteeUsername, schemaId } = data.data;
    
    // Find the invitee's connection and notify them
    for (const [userId, connection] of this.userConnections) {
      if (userId === inviteeUsername && connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify({
          type: 'schema_shared',
          data: { schemaId }
        }));
        break;
      }
    }

    console.log(`Schema ${schemaId} shared with ${inviteeUsername}`);
  }

  handleAccessRevoked(ws, data) {
    const { userId, schemaId } = data.data;
    
    // Find the user's connection and notify them
    const userConnection = this.userConnections.get(userId);
    if (userConnection && userConnection.readyState === WebSocket.OPEN) {
      userConnection.send(JSON.stringify({
        type: 'access_revoked',
        data: { userId, schemaId }
      }));
      
      // Remove from room
      if (this.rooms.has(schemaId)) {
        this.rooms.get(schemaId).delete(userConnection);
      }
    }

    console.log(`Access revoked for ${userId} in schema ${schemaId}`);
  }

  handleCursorUpdate(ws, data) {
    const { schemaId } = ws;
    if (!schemaId) return;

    // Broadcast cursor update to other users in the room
    this.broadcastToRoom(schemaId, {
      type: 'cursor_update',
      data: data.data
    }, ws);
  }

  handleDisconnection(ws) {
    const { userId, schemaId } = ws;
    
    if (userId) {
      this.userConnections.delete(userId);
    }
    
    if (schemaId && this.rooms.has(schemaId)) {
      this.rooms.get(schemaId).delete(ws);
      
      // Notify other users
      this.broadcastToRoom(schemaId, {
        type: 'user_left',
        data: { userId }
      });
    }

    console.log(`User ${userId} disconnected from schema ${schemaId}`);
  }

  broadcastToRoom(schemaId, message, excludeConnection = null) {
    const room = this.rooms.get(schemaId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    
    room.forEach(connection => {
      if (connection !== excludeConnection && connection.readyState === WebSocket.OPEN) {
        connection.send(messageStr);
      }
    });
  }

  // Cleanup empty rooms periodically
  startCleanup() {
    setInterval(() => {
      for (const [schemaId, connections] of this.rooms) {
        // Remove closed connections
        const activeConnections = new Set();
        connections.forEach(conn => {
          if (conn.readyState === WebSocket.OPEN) {
            activeConnections.add(conn);
          }
        });
        
        if (activeConnections.size === 0) {
          this.rooms.delete(schemaId);
        } else {
          this.rooms.set(schemaId, activeConnections);
        }
      }
    }, 30000); // Cleanup every 30 seconds
  }
}

// Start the collaboration server
const collaborationServer = new CollaborationServer();
collaborationServer.startCleanup();

module.exports = CollaborationServer;