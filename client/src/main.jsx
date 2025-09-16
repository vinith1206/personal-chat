import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Chat from './pages/Chat.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { startConnectionMonitoring } from './lib/api.js'

const router = createBrowserRouter([
	{ path: '/', element: <Chat /> },
])

// Initialize connection monitoring
if (typeof window !== 'undefined') {
	startConnectionMonitoring()
}

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<ErrorBoundary>
			<AuthProvider>
				<RouterProvider router={router} />
			</AuthProvider>
		</ErrorBoundary>
	</React.StrictMode>,
)
