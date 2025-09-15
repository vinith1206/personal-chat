import axios from 'axios'

const localGuess = typeof window !== 'undefined'
	? window.location.origin.replace(':5173', ':4000')
	: 'http://localhost:4000'

const baseURL = import.meta.env.VITE_API_BASE || localGuess

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
	const token = localStorage.getItem('token')
	if (token) config.headers.Authorization = `Bearer ${token}`
	return config
})
