import { io } from 'socket.io-client';

const defaultUrl = import.meta.env.PROD
  ? 'https://candyminigames-server.onrender.com'
  : 'http://localhost:3001';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || defaultUrl;

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true });
  }
  return socket;
}

/** Ping the game server (GET /). Resolves true if ok, false on failure. */
export async function pingServer(timeoutMs = 8000) {
  try {
    const url = SOCKET_URL.startsWith('http') ? SOCKET_URL : `https://${SOCKET_URL}`;
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(timeoutMs) });
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.ok === true;
  } catch {
    return false;
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
