# Deployment Guide

This guide will help you deploy your Private Chat application to Vercel with all the comprehensive error handling and production optimizations.

## 🚀 Quick Deploy

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production-ready chat application"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the Vite configuration

3. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add the following variables:

   ```env
   VITE_API_BASE=https://your-app.vercel.app
   VITE_SOCKET_URL=https://your-app.vercel.app
   NODE_ENV=production
   LOG_LEVEL=INFO
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your app will be available at `https://your-app.vercel.app`

### Option 2: Deploy with Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

## 🔧 Configuration

### Environment Variables

Set these in your Vercel dashboard:

#### Required Variables
```env
VITE_API_BASE=https://your-app.vercel.app
VITE_SOCKET_URL=https://your-app.vercel.app
```

#### Optional Variables
```env
NODE_ENV=production
LOG_LEVEL=INFO
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/your-database
JWT_SECRET=your-jwt-secret-here
CLIENT_ORIGIN=https://your-app.vercel.app
```

### Vercel Configuration

The `vercel.json` file is already configured with:

- **Function Limits**: 30-second max duration
- **Security Headers**: XSS, CSRF, and content protection
- **Environment Variables**: Production settings
- **Region**: IAD1 for optimal performance
- **Framework**: Vite detection

## 📊 Monitoring

### Health Checks

After deployment, test these endpoints:

- **Health Check**: `https://your-app.vercel.app/api/health`
- **Error Logging**: `https://your-app.vercel.app/api/errors`
- **Log Collection**: `https://your-app.vercel.app/api/logs`

### Performance Monitoring

1. **Vercel Analytics**: Enable in Vercel dashboard
2. **Console Logs**: Check browser console for client logs
3. **Function Logs**: Check Vercel function logs
4. **Error Tracking**: Monitor error rates and types

## 🔒 Security

### Security Headers

The application includes these security headers:

- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: DENY
- **X-XSS-Protection**: 1; mode=block
- **Referrer-Policy**: strict-origin-when-cross-origin

### Rate Limiting

- **Per IP**: 100 requests per minute
- **Per Endpoint**: 10 requests per minute
- **File Uploads**: 5 files per request

### Input Validation

- **File Size**: 10MB maximum
- **Request Size**: 4.5MB maximum
- **Header Size**: 8KB maximum
- **Message Length**: 4000 characters maximum

## 🚀 Performance

### Optimizations

- **Code Splitting**: Optimized bundle chunks
- **Tree Shaking**: Remove unused code
- **Image Optimization**: Automatic processing
- **CDN**: Vercel's global CDN
- **Caching**: Proper cache headers

### Bundle Analysis

The build creates these optimized chunks:

- **vendor**: React, React-DOM (140KB)
- **router**: React Router (77KB)
- **socket**: Socket.IO client (41KB)
- **http**: Axios HTTP client (36KB)
- **emoji**: Emoji picker (457KB)
- **main**: Application code (21KB)

## 🧪 Testing

### Pre-Deployment Testing

1. **Local Testing**
   ```bash
   npm run dev
   # Test at http://localhost:5173
   ```

2. **Build Testing**
   ```bash
   npm run build
   npm run preview
   # Test at http://localhost:4173
   ```

3. **Error Scenarios**
   - Disconnect internet
   - Upload large files
   - Make rapid requests
   - Test error boundaries

### Post-Deployment Testing

1. **Health Check**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

2. **Function Testing**
   ```bash
   curl https://your-app.vercel.app/api/chat/rooms
   ```

3. **Error Handling**
   - Test with invalid requests
   - Check error responses
   - Verify logging

## 🔄 Updates

### Updating the Application

1. **Make Changes**
   ```bash
   # Make your changes
   git add .
   git commit -m "Update application"
   git push origin main
   ```

2. **Automatic Deployment**
   - Vercel will automatically deploy
   - Check deployment status in dashboard
   - Test the updated application

### Rollback

If something goes wrong:

1. **Go to Vercel Dashboard**
2. **Select your project**
3. **Go to Deployments**
4. **Click "Promote to Production"** on a previous deployment

## 📈 Analytics

### Vercel Analytics

1. **Enable Analytics**
   - Go to Project Settings
   - Enable Vercel Analytics
   - View real-time metrics

2. **Monitor Performance**
   - Page views and sessions
   - Core Web Vitals
   - Function execution times
   - Error rates

### Custom Logging

The application includes comprehensive logging:

- **Client Logs**: User interactions, errors, performance
- **Server Logs**: API calls, database operations, errors
- **Error Tracking**: Centralized error collection
- **Performance Metrics**: Response times and memory usage

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (18+)
   - Verify all dependencies installed
   - Check for TypeScript errors

2. **Function Timeouts**
   - Check function execution time
   - Optimize database queries
   - Reduce payload sizes

3. **Memory Issues**
   - Monitor memory usage
   - Optimize image processing
   - Reduce bundle size

4. **API Errors**
   - Check environment variables
   - Verify API endpoints
   - Check function logs

### Debugging

1. **Function Logs**
   - Go to Vercel Dashboard
   - Select your project
   - Go to Functions tab
   - View real-time logs

2. **Client Logs**
   - Open browser console
   - Check for error messages
   - Look for performance warnings

3. **Health Check**
   - Visit `/api/health`
   - Check all health indicators
   - Verify service status

## 📞 Support

If you encounter issues:

1. **Check Documentation**: Review this guide
2. **Check Logs**: Look at function and client logs
3. **Test Health**: Visit `/api/health`
4. **Create Issue**: Use GitHub issues
5. **Vercel Support**: Contact Vercel support

---

**Your Private Chat application is now production-ready with comprehensive error handling and monitoring! 🎉**
