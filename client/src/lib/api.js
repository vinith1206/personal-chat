import axios from 'axios'
import { logApiCall, logNetworkError, logError } from '../utils/logger'

const localGuess = typeof window !== 'undefined'
	? window.location.origin.replace(':5173', ':4000')
	: 'http://localhost:4000'

const baseURL = import.meta.env.VITE_API_BASE || localGuess

// Retry configuration
const RETRY_CONFIG = {
	retries: 3,
	retryDelay: 1000,
	retryCondition: (error) => {
		// Retry on network errors or 5xx status codes
		return !error.response || error.response.status >= 500
	}
}

// Timeout configuration
const TIMEOUT_CONFIG = {
	timeout: 30000, // 30 seconds
	timeoutErrorMessage: 'Request timeout - please try again'
}

export const api = axios.create({ 
	baseURL,
	timeout: TIMEOUT_CONFIG.timeout,
	timeoutErrorMessage: TIMEOUT_CONFIG.timeoutErrorMessage
})

// Request interceptor
api.interceptors.request.use(
	(config) => {
		const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		
		// Add request ID for tracking
		config.metadata = { startTime: Date.now() }
		
		return config
	},
	(error) => {
		logError('Request interceptor error', error)
		return Promise.reject(error)
	}
)

// Response interceptor with retry logic
api.interceptors.response.use(
	(response) => {
		const duration = Date.now() - response.config.metadata.startTime
		logApiCall(
			response.config.url,
			response.config.method.toUpperCase(),
			response.status,
			duration
		)
		return response
	},
	async (error) => {
		const config = error.config
		
		// Don't retry if already retried
		if (!config || config.__retryCount >= RETRY_CONFIG.retries) {
			const duration = config ? Date.now() - config.metadata.startTime : 0
			logNetworkError(
				config?.url || 'unknown',
				config?.method?.toUpperCase() || 'unknown',
				error
			)
			return Promise.reject(error)
		}

		// Initialize retry count
		config.__retryCount = config.__retryCount || 0

		// Check if we should retry
		if (RETRY_CONFIG.retryCondition(error)) {
			config.__retryCount += 1
			
			// Calculate delay with exponential backoff
			const delay = RETRY_CONFIG.retryDelay * Math.pow(2, config.__retryCount - 1)
			
			// Add jitter to prevent thundering herd
			const jitter = Math.random() * 1000
			const totalDelay = delay + jitter
			
			logError(`Retrying request (attempt ${config.__retryCount}/${RETRY_CONFIG.retries})`, error, {
				url: config.url,
				delay: totalDelay
			})
			
			// Wait before retrying
			await new Promise(resolve => setTimeout(resolve, totalDelay))
			
			return api(config)
		}

		// Don't retry, log and reject
		const duration = config ? Date.now() - config.metadata.startTime : 0
		logNetworkError(
			config?.url || 'unknown',
			config?.method?.toUpperCase() || 'unknown',
			error
		)
		
		return Promise.reject(error)
	}
)

// Enhanced API methods with error handling
export const apiClient = {
	async get(url, config = {}) {
		try {
			const response = await api.get(url, config)
			return response
		} catch (error) {
			throw handleApiError(error)
		}
	},

	async post(url, data, config = {}) {
		try {
			const response = await api.post(url, data, config)
			return response
		} catch (error) {
			throw handleApiError(error)
		}
	},

	async put(url, data, config = {}) {
		try {
			const response = await api.put(url, data, config)
			return response
		} catch (error) {
			throw handleApiError(error)
		}
	},

	async delete(url, config = {}) {
		try {
			const response = await api.delete(url, config)
			return response
		} catch (error) {
			throw handleApiError(error)
		}
	},

	async upload(url, formData, config = {}) {
		try {
			const response = await api.post(url, formData, {
				...config,
				headers: {
					'Content-Type': 'multipart/form-data',
					...config.headers
				}
			})
			return response
		} catch (error) {
			throw handleApiError(error)
		}
	}
}

// Error handler for API responses
function handleApiError(error) {
	if (error.response) {
		// Server responded with error status
		const { status, data } = error.response
		
		switch (status) {
			case 400:
				return new Error(data?.message || 'Bad Request - Please check your input')
			case 401:
				return new Error('Unauthorized - Please log in again')
			case 403:
				return new Error('Forbidden - You don\'t have permission to perform this action')
			case 404:
				return new Error('Not Found - The requested resource was not found')
			case 413:
				return new Error('Payload Too Large - The file or data is too large')
			case 429:
				return new Error('Too Many Requests - Please wait before trying again')
			case 500:
				return new Error('Server Error - Please try again later')
			case 502:
				return new Error('Bad Gateway - Service temporarily unavailable')
			case 503:
				return new Error('Service Unavailable - Please try again later')
			case 504:
				return new Error('Gateway Timeout - Request timed out')
			default:
				return new Error(data?.message || `Request failed with status ${status}`)
		}
	} else if (error.request) {
		// Network error
		if (error.code === 'ECONNABORTED') {
			return new Error('Request timeout - Please check your connection and try again')
		}
		return new Error('Network error - Please check your connection')
	} else {
		// Other error
		return new Error(error.message || 'An unexpected error occurred')
	}
}

// Health check function
export async function checkApiHealth() {
	try {
		const response = await api.get('/health')
		return response.status === 200
	} catch (error) {
		logError('API health check failed', error)
		return false
	}
}

// Connection monitoring
export function startConnectionMonitoring() {
	if (typeof window === 'undefined') return

	let isOnline = navigator.onLine
	let reconnectAttempts = 0
	const maxReconnectAttempts = 5

	const handleOnline = () => {
		isOnline = true
		reconnectAttempts = 0
		logInfo('Connection restored')
	}

	const handleOffline = () => {
		isOnline = false
		logError('Connection lost')
	}

	const checkConnection = async () => {
		if (!isOnline) {
			try {
				const healthy = await checkApiHealth()
				if (healthy) {
					handleOnline()
				} else if (reconnectAttempts < maxReconnectAttempts) {
					reconnectAttempts++
					logError(`Connection check failed (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
					setTimeout(checkConnection, 5000 * reconnectAttempts)
				}
			} catch (error) {
				if (reconnectAttempts < maxReconnectAttempts) {
					reconnectAttempts++
					logError(`Connection check error (attempt ${reconnectAttempts}/${maxReconnectAttempts})`, error)
					setTimeout(checkConnection, 5000 * reconnectAttempts)
				}
			}
		}
	}

	window.addEventListener('online', handleOnline)
	window.addEventListener('offline', handleOffline)
	
	// Check connection every 30 seconds
	const interval = setInterval(checkConnection, 30000)
	
	// Return cleanup function
	return () => {
		window.removeEventListener('online', handleOnline)
		window.removeEventListener('offline', handleOffline)
		clearInterval(interval)
	}
}

export { api as default }
