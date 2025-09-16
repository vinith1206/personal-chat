# Private Chat Application

A modern, real-time chat application built with React, Vite, and Vercel serverless functions. Features comprehensive error handling, resilience patterns, and production-ready optimizations.

## 🚀 Features

### Core Functionality
- **Real-time messaging** with Socket.IO
- **File uploads** (images, videos, documents)
- **Emoji support** with emoji picker
- **Dark/Light theme** toggle
- **Room-based chat** (general, memes, random)
- **Invite links** for private rooms
- **Online user presence**

### Production-Ready Features
- **Comprehensive error handling** for all Vercel runtime errors
- **Automatic retry logic** with exponential backoff
- **Timeout handling** (30s for functions, 5s for edge)
- **Payload validation** (4.5MB request limit)
- **Rate limiting** (100 requests/minute per IP)
- **Memory monitoring** and optimization
- **Infinite loop prevention**
- **DNS and external API error handling**
- **Image optimization** with error handling
- **Range request validation**
- **Request header size validation**
- **Security headers** and protection
- **Graceful degradation** patterns
- **Comprehensive logging** (client + server)
- **Health monitoring** and checks
- **Connection monitoring** and reconnection

## 🏗️ Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **HTTP Client**: Axios with retry logic
- **Real-time**: Socket.IO client
- **Error Handling**: React Error Boundaries
- **Logging**: Client-side structured logging

### Backend (Vercel Serverless)
- **Runtime**: Node.js 18
- **Functions**: Vercel serverless functions
- **Database**: MongoDB Atlas (with in-memory fallback)
- **File Storage**: Vercel blob storage
- **Middleware**: Custom error handling middleware
- **Logging**: Server-side structured logging

## 📁 Project Structure

```
├── api/                          # Vercel serverless functions
│   ├── _middleware.js            # Global middleware
│   ├── chat/
│   │   ├── messages/route.js     # Message CRUD operations
│   │   ├── rooms/route.js        # Room management
│   │   └── upload/route.js       # File upload handling
│   ├── errors/route.js           # Error logging
│   ├── health/route.js           # Health checks
│   ├── logs/route.js             # Log collection
│   └── utils/
│       ├── errorHandler.js       # Error handling utilities
│       └── logger.js             # Logging utilities
├── client/                       # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── ErrorBoundary.jsx # Error boundary component
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Authentication context
│   │   ├── lib/
│   │   │   └── api.js            # API client with retry logic
│   │   ├── pages/
│   │   │   └── Chat.jsx          # Main chat component
│   │   ├── utils/
│   │   │   └── logger.js         # Client-side logging
│   │   ├── main.jsx              # App entry point
│   │   └── index.css             # Global styles
│   ├── package.json              # Frontend dependencies
│   ├── vite.config.js            # Vite configuration
│   └── tailwind.config.js        # Tailwind configuration
├── vercel.json                   # Vercel deployment config
└── README.md                     # This file
```

## 🚀 Deployment

### Prerequisites
- Node.js 18+
- Vercel CLI (optional)
- Database account (optional)

### Environment Variables

Set these in your Vercel dashboard:

```env
# Client Environment Variables
VITE_API_BASE=https://your-app.vercel.app
VITE_SOCKET_URL=https://your-app.vercel.app

# Server Environment Variables (optional)
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-here
CLIENT_ORIGIN=https://your-app.vercel.app
LOG_LEVEL=INFO
```

### Deploy to Vercel

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy

```bash
# Using Vercel CLI
vercel --prod
```

## 🛠️ Development

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/your-username/private-chat.git
cd private-chat
```

2. **Install dependencies**
```bash
cd client
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Open browser**
```
http://localhost:5173
```

### Building for Production

```bash
cd client
npm run build
```

## 🔧 Error Handling

### Client-Side Error Handling
- **Error Boundaries**: Catch React component errors
- **API Retry Logic**: Automatic retry with exponential backoff
- **Connection Monitoring**: Detect and handle network issues
- **Graceful Degradation**: Fallback UI for errors
- **User Feedback**: Clear error messages and actions

### Server-Side Error Handling
- **Timeout Handling**: 30-second function timeouts
- **Payload Validation**: Request/response size limits
- **Rate Limiting**: Prevent abuse and infinite loops
- **Memory Monitoring**: Track and prevent memory leaks
- **External API Handling**: Retry logic for external calls
- **Database Error Handling**: Graceful database failures

### Vercel Platform Errors
- **FUNCTION_THROTTLED**: Handled with retry logic
- **INTERNAL_FUNCTION_INVOCATION_FAILED**: Graceful error responses
- **DEPLOYMENT_PAUSED**: User-friendly error messages
- **Memory Limits**: Proactive memory monitoring
- **Timeout Errors**: Proper 504 responses

## 📊 Monitoring

### Health Checks
- **Endpoint**: `/api/health`
- **Checks**: Memory, database, external services
- **Response**: JSON with health status

### Logging
- **Client Logs**: User interactions, errors, performance
- **Server Logs**: API calls, database operations, errors
- **Format**: Structured JSON logs
- **Levels**: ERROR, WARN, INFO, DEBUG

### Error Tracking
- **Endpoint**: `/api/errors`
- **Collection**: Client-side errors
- **Storage**: Structured error data

## 🔒 Security

### Security Headers
- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: DENY
- **X-XSS-Protection**: 1; mode=block
- **Referrer-Policy**: strict-origin-when-cross-origin

### Input Validation
- **File Uploads**: Type and size validation
- **Request Payloads**: Size and format validation
- **Headers**: Size and content validation
- **User Input**: Sanitization and validation

### Rate Limiting
- **Per IP**: 100 requests per minute
- **Per Endpoint**: 10 requests per minute
- **File Uploads**: 5 files per request
- **Message Length**: 4000 characters max

## 🚀 Performance

### Optimizations
- **Code Splitting**: Optimized bundle chunks
- **Tree Shaking**: Remove unused code
- **Image Optimization**: Automatic image processing
- **Caching**: Proper cache headers
- **CDN**: Vercel's global CDN

### Bundle Analysis
- **Vendor Chunk**: React, React-DOM
- **Router Chunk**: React Router
- **Socket Chunk**: Socket.IO client
- **Emoji Chunk**: Emoji picker library
- **HTTP Chunk**: Axios HTTP client

## 🧪 Testing

### Error Scenarios
- **Network Failures**: Disconnect internet
- **Large Files**: Upload files > 10MB
- **Rate Limiting**: Make rapid requests
- **Memory Limits**: Trigger memory warnings
- **Timeout Errors**: Slow network conditions

### Monitoring
- **Console Logs**: Check browser console
- **Network Tab**: Monitor API calls
- **Performance**: Check bundle size and load times

## 📈 Analytics

### User Interactions
- **Message Sending**: Track message frequency
- **File Uploads**: Monitor upload success/failure
- **Room Creation**: Track room creation
- **Error Events**: Monitor error frequency

### Performance Metrics
- **Response Times**: API call durations
- **Memory Usage**: Client and server memory
- **Error Rates**: Error frequency and types
- **User Engagement**: Active users and sessions

## 🔄 Updates

### Version History
- **v1.0.0**: Initial release with basic chat
- **v1.1.0**: Added file uploads and emojis
- **v1.2.0**: Added comprehensive error handling
- **v1.3.0**: Added production optimizations

### Future Features
- **User Authentication**: JWT-based auth
- **Message Encryption**: End-to-end encryption
- **Voice Messages**: Audio recording and playback
- **Screen Sharing**: Real-time screen sharing
- **Mobile App**: React Native mobile app

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- **GitHub Issues**: Create an issue
- **Documentation**: Check this README
- **Health Check**: Visit `/api/health`

---

**Built with ❤️ using React, Vite, and Vercel**