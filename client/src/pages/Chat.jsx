import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext.jsx'
import data from '@emoji-mart/data'
import { Picker } from 'emoji-mart'

function classNames(...c){ return c.filter(Boolean).join(' ') }
function initials(name){
	if (!name) return 'G'
	const parts = name.trim().split(/\s+/)
	const a = (parts[0]?.[0] || '').toUpperCase()
	const b = (parts[1]?.[0] || '').toUpperCase()
	return (a + b).slice(0,2) || 'G'
}

const ROOM_ICONS = { general: '💬', memes: '🎭', random: '🎲' }
const ROOMS = ['general','memes','random']

export default function Chat() {
	const { name, setName } = useAuth()
	const [messages, setMessages] = useState([])
	const [text, setText] = useState('')
	const [roomId, setRoomId] = useState('general')
	const [isTypingUsers, setIsTypingUsers] = useState([])
	const [file, setFile] = useState(null)
	const [showPicker, setShowPicker] = useState(false)
	const [onlineUsers, setOnlineUsers] = useState([])
	const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
	const typingTimeout = useRef(null)
	const listRef = useRef(null)

	// Join via invite code in URL
	useEffect(() => {
		const params = new URLSearchParams(window.location.search)
		const code = params.get('join')
		if (code) {
			api.get(`/api/chat/rooms/invite/${code}`).then((res) => {
				if (res.data?.room?.id) setRoomId(res.data.room.id)
			})
		}
	}, [])

	useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('theme', dark ? 'dark' : 'light') }, [dark])

	const socket = useMemo(() => {
		const url = import.meta.env.VITE_SOCKET_URL || (typeof window!== 'undefined' ? window.location.origin.replace(':5173', ':4000') : 'http://localhost:4000')
		return io(url, { auth: { name: name || 'Guest' } })
	}, [name])

	useEffect(() => {
		socket.emit('joinRoom', roomId)
		socket.on('message:new', (msg) => setMessages((prev) => [...prev, msg]))
		socket.on('typing', ({ userId, isTyping }) => {
			setIsTypingUsers((prev) => {
				const set = new Set(prev)
				if (isTyping) set.add(userId); else set.delete(userId)
				return Array.from(set)
			})
		})
		socket.on('presence:list', ({ users }) => setOnlineUsers(users))
		return () => {
			socket.off('message:new')
			socket.off('typing')
			socket.off('presence:list')
			socket.disconnect()
		}
	}, [socket, roomId])

	useEffect(() => {
		async function load() {
			const res = await api.get(`/api/chat/rooms/${roomId}/messages`)
			setMessages(res.data.messages)
		}
		load()
	}, [roomId])

	useEffect(() => {
		if (!listRef.current) return
		listRef.current.scrollTop = listRef.current.scrollHeight
	}, [messages.length])

	function onTyping() {
		socket.emit('typing', { roomId, isTyping: true })
		if (typingTimeout.current) clearTimeout(typingTimeout.current)
		typingTimeout.current = setTimeout(() => socket.emit('typing', { roomId, isTyping: false }), 1200)
	}

	async function send(e) {
		e.preventDefault()
		if (!text.trim() && !file) return
		let attachments = []
		if (file) {
			const form = new FormData()
			form.append('file', file)
			const u = await api.post('/api/chat/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
			attachments = [u.data.attachment]
		}
		await api.post(`/api/chat/rooms/${roomId}/messages`, { text, attachments }, { headers: { 'x-user-name': name || 'Guest' } })
		setText('')
		setFile(null)
		setShowPicker(false)
	}

	async function createInvite() {
		const r = prompt('Name this room (optional):', 'Friends')
		const res = await api.post('/api/chat/rooms/invite', { name: r || undefined }, { headers: { 'x-user-name': name || 'Guest' } })
		const url = res.data?.invite?.url
		if (url) {
			navigator.clipboard?.writeText(url)
			alert(`Invite link copied:\n${url}`)
		}
	}

	return (
		<div className={classNames('h-screen', dark ? 'dark bg-zinc-900' : 'bg-gray-50')}>
			<div className="mx-auto h-full max-w-6xl grid grid-cols-1 md:grid-cols-[320px_1fr]">
				{/* Sidebar */}
				<aside className="border-r bg-gray-100 dark:bg-zinc-800 dark:border-zinc-800 p-3 hidden md:flex flex-col">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center font-semibold shadow-soft">{initials(name)}</div>
						<div className="flex-1">
							<input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 rounded px-3 py-2 text-sm" />
						</div>
						<button onClick={()=>setDark(d=>!d)} className="text-sm px-2 py-1 rounded border border-gray-200 dark:border-zinc-600">{dark ? 'Light' : 'Dark'}</button>
					</div>
					<div className="mt-5">
						<div className="flex items-center justify-between">
							<h2 className="text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-400">Online ({onlineUsers.length})</h2>
							<button onClick={createInvite} className="text-xs px-2 py-1 rounded bg-white dark:bg-zinc-700 shadow-soft">Create invite</button>
						</div>
						<div className="mt-2 flex flex-wrap gap-2">
							{onlineUsers.map(u => (
								<div key={u.id} title={u.name} className="flex items-center gap-1 bg-white dark:bg-zinc-700 px-2 py-1 rounded-full shadow-soft">
									<div className="w-5 h-5 rounded-full bg-green-500/90 text-white text-[10px] flex items-center justify-center">{initials(u.name)}</div>
									<span className="text-xs dark:text-zinc-100 max-w-[90px] truncate">{u.name}</span>
								</div>
							))}
						</div>
					</div>
					<div className="mt-6">
						<h2 className="text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-400">Rooms</h2>
						<div className="mt-2 space-y-1">
							{ROOMS.map(r => (
								<button key={r} onClick={()=>setRoomId(r)} className={classNames('w-full text-left px-3 py-2 rounded flex items-center gap-2 hover:bg-white dark:hover:bg-zinc-700', roomId===r && 'bg-white dark:bg-zinc-700 font-medium shadow-soft')}>
									<span>{ROOM_ICONS[r]}</span>
									<span className="capitalize">{r}</span>
								</button>
							))}
						</div>
					</div>
				</aside>

				{/* Main Chat Area */}
				<section className="flex flex-col h-full">
					<header className="border-b bg-white dark:bg-zinc-850/50 dark:border-zinc-800 p-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">{ROOM_ICONS[roomId]}</div>
								<p className="font-semibold dark:text-zinc-100">#{roomId}</p>
							</div>
							<button onClick={()=>setDark(d=>!d)} className="md:hidden text-sm px-2 py-1 rounded border border-gray-200 dark:border-zinc-600">{dark ? 'Light' : 'Dark'}</button>
						</div>
						<div className="mt-2 h-px bg-gray-200 dark:bg-zinc-800" />
					</header>

					<div ref={listRef} className="flex-1 overflow-y-auto p-3 md:p-5 space-y-2 bg-gray-50 dark:bg-zinc-900">
						{messages.map((m, i) => {
							const mine = m.senderName === (name || 'Guest')
							const prev = messages[i-1]
							const sameAsPrev = prev && prev.senderName === m.senderName
							const showHeader = !sameAsPrev
							return (
								<div key={m._id} className={classNames('flex items-end gap-2', mine ? 'justify-end' : 'justify-start', showHeader ? 'mt-3' : 'mt-1')}>
									{!mine && (
										<div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-zinc-700 text-[11px] flex items-center justify-center font-medium text-gray-700 dark:text-zinc-200">
											{initials(m.senderName)}
										</div>
									)}
									<div className="flex flex-col items-end max-w-[78%]">
										{showHeader && !mine && (
											<div className="text-xs mb-1 ml-1 text-gray-500 dark:text-zinc-400">{m.senderName}</div>
										)}
										<div className={classNames('rounded-2xl px-3 py-2 shadow-soft', mine ? 'bg-blue-600 text-white rounded-br-sm dark:bg-emerald-600' : 'bg-white dark:bg-zinc-800 dark:text-zinc-100 rounded-bl-sm')}>
											{m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
											{m.attachments?.map((a,i)=> (
												<div key={i} className="mt-2">
													{a.mimeType.startsWith('image/') ? (
														<img src={a.url} alt={a.fileName} className="max-h-64 rounded" />
													) : a.mimeType.startsWith('video/') ? (
														<video src={a.url} controls className="max-h-64 rounded" />
													) : (
														<a href={a.url} target="_blank" rel="noreferrer" className="underline">{a.fileName}</a>
													)}
												</div>
											))}
										</div>
										<div className={classNames('text-[10px] mt-1', mine ? 'text-blue-200 dark:text-emerald-200' : 'text-gray-400 dark:text-zinc-400')}>{new Date(m.createdAt).toLocaleTimeString()}</div>
									</div>
								</div>
							)
						})}
						{isTypingUsers.length > 0 && (
							<div className="text-xs text-gray-500 dark:text-zinc-400 italic px-2">Someone is typing…</div>
						)}
					</div>

					<form onSubmit={send} className="p-3 md:p-4 border-t bg-white dark:bg-zinc-850/50 dark:border-zinc-800 sticky bottom-0">
						<div className="flex items-center gap-2">
							<button type="button" onClick={() => setShowPicker(v=>!v)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center" title="Emoji">😊</button>
							{showPicker && (
								<div className="absolute bottom-20 left-4 bg-white dark:bg-zinc-800 shadow rounded">
									<Picker data={data} onEmojiSelect={(e)=>{ setText(t=>t + e.native); setShowPicker(false) }} theme={dark ? 'dark' : 'light'} />
								</div>
							)}
							<label className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center cursor-pointer" title="Add file">
								<input type="file" className="hidden" onChange={(e)=>setFile(e.target.files[0])} />
								<span className="text-lg">＋</span>
							</label>
							<input value={text} onChange={(e)=>setText(e.target.value)} onInput={onTyping} placeholder="Type a message…" className="flex-1 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 rounded-full px-4 py-3" />
							<button className="w-10 h-10 rounded-full bg-blue-600 dark:bg-emerald-600 text-white flex items-center justify-center shadow-soft" title="Send">✈️</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	)
}
