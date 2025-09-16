import { createContext, useContext, useMemo, useState } from 'react'

const NameContext = createContext(null)

export function AuthProvider({ children }) {
	const [name, setName] = useState(() => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem('name') || ''
		}
		return ''
	})
	function saveName(next) {
		if (typeof window !== 'undefined') {
			localStorage.setItem('name', next)
		}
		setName(next)
	}
	const value = useMemo(() => ({ 
		user: name ? { name } : null, 
		name, 
		setName: saveName, 
		loading: false, 
		login:()=>{}, 
		register:()=>{}, 
		logout:()=>{ 
			setName('')
			if (typeof window !== 'undefined') {
				localStorage.removeItem('name')
			}
		} 
	}), [name])
	return <NameContext.Provider value={value}>{children}</NameContext.Provider>
}

export function useAuth() { return useContext(NameContext) }
