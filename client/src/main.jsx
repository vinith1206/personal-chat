import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Chat from './pages/Chat.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

const router = createBrowserRouter([
	{ path: '/', element: <Chat /> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<AuthProvider>
			<RouterProvider router={router} />
		</AuthProvider>
	</React.StrictMode>,
)
