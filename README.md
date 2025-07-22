# Advanced Database Modeling Platform

A comprehensive, production-ready platform for designing, validating, collaborating on, and exporting SQL database schemas with real-time team collaboration features.

## 🚀 Features

### Core Database Design
- **Enhanced Table Builder**: Create tables with real-time FK validation and constraint checking
- **Collapsible Panels**: Expandable/collapsible Tools and Portfolio panels for better workspace management
- **Dynamic Relationship Management**: Visual arrows with live updates and comprehensive relationship panel
- **SQL Anomaly Prevention**: Real-time validation with business rule enforcement
- **Smart Export System**: Export to multiple formats with intelligent naming

### Collaboration & Real-time Features
- **Live Team Collaboration**: Real-time cursors, presence indicators, and schema synchronization
- **WebSocket Integration**: Instant updates across all connected users
- **Role-based Permissions**: Admin, Editor, and Viewer roles with granular access control
- **Real Database Integration**: Shared databases appear automatically in team members' portfolios

### Advanced Tools
- **Categorized Tools Panel**: Organized by Schema Design, Validation, Import/Export, and Collaboration
- **Schema Validation**: Comprehensive anomaly detection with auto-fix suggestions
- **Smart Export Manager**: Support for MySQL, PostgreSQL, MongoDB, JSON, CSV with project-based naming
- **Centered Modal Windows**: All dialogs open centered over the workspace

## 🛠 Technical Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Flow** for diagram visualization
- **Framer Motion** for animations
- **WebSocket** for real-time features

### Backend Integration
- **Node.js/Express** API layer
- **WebSocket** for real-time collaboration
- **MongoDB** for persistence
- **JWT** authentication
- **Role-based access control**

### Real-time Collaboration
- **WebSocket connections** for live updates
- **Real-time schema synchronization** across all connected users
- **Presence awareness** with live cursors
- **Automatic portfolio updates** when databases are shared

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server (includes WebSocket server)
npm run dev

# Build for production
npm run build
```

## 🔧 Configuration

### Environment Variables
```env
# Database
MONGO_URL=mongodb://localhost:27017/database-designer
JWT_SECRET=your-jwt-secret

# SMTP for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# PayPal (for subscriptions)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_SECRET=your-paypal-secret
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com

# WebSocket
WS_PORT=8080
```

### WebSocket Server Setup
The platform includes a WebSocket server for real-time collaboration:

```javascript
# Start WebSocket server
npm run ws-server

# Or start both servers together
npm run dev
```

## 🎯 Usage Guide

### 1. Enhanced Table Creation
- Use the Enhanced Table Builder for FK validation
- Real-time constraint checking prevents SQL anomalies
- Dynamic relationship arrows update automatically

### 2. Real-time Collaboration
- Multiple users can edit simultaneously
- Shared databases appear automatically in team portfolios
- Changes sync instantly across all clients
- Access revocation removes databases immediately

### 3. Collapsible Interface
- Collapse Tools and Portfolio panels for more workspace
- Categorized tools for better organization
- Centered modal windows for better UX

### 4. SQL Validation
- Automatic anomaly detection
- Business rule enforcement
- Auto-fix suggestions for common issues

### 5. Smart Export
- Multiple format support (SQL, JSON, CSV)
- Project-based filename generation
- Export history tracking

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000 8080
CMD ["npm", "start"]
```

### Production Setup
1. Set up MongoDB database
2. Configure environment variables
3. Start both HTTP and WebSocket servers
4. Configure reverse proxy (nginx) for WebSocket support

## 🔐 Security Features

- **JWT Authentication** with refresh tokens
- **Role-based Access Control** (RBAC)
- **Input Validation** and sanitization
- **SQL Injection Prevention**
- **XSS Protection**
- **WebSocket Authentication**

## 📈 Performance Optimizations

- **Collapsible Panels** for reduced DOM complexity
- **Memoization** for expensive computations
- **WebSocket Connection Pooling**
- **Debounced Real-time Updates**
- **Optimistic UI Updates**

## 🎨 UI/UX Enhancements

- **Collapsible Panels**: Tools and Portfolio panels can be collapsed for more workspace
- **Categorized Tools**: Organized by Schema Design, Validation, Import/Export, and Collaboration
- **Centered Modals**: All dialogs open centered over the workspace
- **Smart Export**: Project-based filename generation
- **Real-time Validation**: Instant feedback on schema changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

### Code Style
- ESLint + Prettier configuration
- TypeScript strict mode
- Conventional commit messages
- Component-based architecture

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Issues: [GitHub Issues](https://github.com/your-org/database-designer/issues)
- Email: piriyevtural00@gmail.com

## 🗺 Roadmap

### Q1 2025
- [x] Collapsible panel interface
- [x] Enhanced table builder with FK validation
- [x] Real-time collaboration with WebSocket
- [x] Smart export with project-based naming

### Q2 2025
- [ ] Advanced SQL editor with Monaco
- [ ] Schema versioning and history
- [ ] Advanced export formats (TypeScript, Prisma)
- [ ] Performance monitoring

### Q3 2025
- [ ] AI-powered schema suggestions
- [ ] Advanced collaboration features
- [ ] Enterprise SSO integration
- [ ] Mobile responsive design

---

Built with ❤️ by the Database Designer Team