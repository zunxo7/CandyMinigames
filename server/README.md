# Minigames Socket Server

Real-time server for party and co-op Crumb Clash (Socket.io).

## Local

```bash
# From repo root
npm run server

# Or from server/
cd server && npm install && npm start
```

Runs on `http://localhost:3001`. The Vite app uses `VITE_SOCKET_URL=http://localhost:3001` (or omit for this default).

## Deploy on Render

1. **New** → **Web Service**. Connect this repo.
2. **Root Directory**: leave blank (or set to repo root).
3. **Build Command**: `cd server && npm install`
4. **Start Command**: `cd server && node index.js`
5. Create. Render sets `PORT`; the server uses `process.env.PORT`.
6. In your frontend (Vite), set `VITE_SOCKET_URL=https://your-service-name.onrender.com` for production.

Free tier: service sleeps after ~15 min inactivity; first request may be slow (cold start).
