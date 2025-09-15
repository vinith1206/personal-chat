# Private Chatting App

Full-stack private chat for you and friends. React + Tailwind frontend, Node + Express + Socket.io backend, MongoDB (with in-memory fallback for dev).

## Local Development

Prereqs: Node 18+ (20+ recommended), npm.

1. Backend
```
cd server
npm install
npm run dev
```
- Server: http://localhost:4000
- Health: /health
- Env: see `.env` (JWT_SECRET auto-generated; uses in-memory Mongo if MONGO_URI not reachable)

2. Frontend
```
cd client
npm install
npm run dev
```
- App: http://localhost:5173

3. Login/Register then chat. Uploads served under `/uploads/*`.

## Features
- Auth (JWT), protected API
- Real-time messaging (Socket.io)
- Text, emojis, file/image/video attachments with preview
- Typing indicator, online presence
- Edit/delete own messages, reactions (👍 😂 ❤️)

## Deploy

### Backend (Render/Heroku)
- Render: use `server/render.yaml` or create a Web Service with:
  - Root: `server`
  - Build: `npm install`
  - Start: `node src/index.js`
  - Env: `JWT_SECRET`, `CLIENT_ORIGIN`, `MONGO_URI`

### Frontend (Vercel/Netlify)
- Vercel: Project root `client`, Framework: Vite, Build `npm run build`, Output `dist`. Add environment `VITE_API_BASE` if you change API origin.
- Netlify: `client/netlify.toml` provided. Set site to `client`, build command `npm run build`, publish `dist`.

## Config
- Change API base in `client/src/lib/api.js` if backend is remote.
- CORS origin in `server/.env` `CLIENT_ORIGIN`.

## Next Ideas
- Room codes and invites
- Avatars and profiles
- Dark/light theme toggle
- Message read receipts
