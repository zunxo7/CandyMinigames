import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 3001;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 5;

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnon = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

app.post('/api/admin/update-auth-email', async (req, res) => {
  if (!supabaseAnon || !supabaseAdmin) {
    return res.status(503).json({ error: 'Server auth not configured' });
  }
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization' });
  }
  const { userId, newUsername } = req.body || {};
  const trimmed = (newUsername || '').toString().trim();
  if (!userId || !trimmed) {
    return res.status(400).json({ error: 'userId and newUsername required' });
  }
  try {
    const { data: { user: caller }, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError || !caller) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const { data: profile } = await supabaseAdmin.from('profiles').select('username').eq('id', caller.id).single();
    if ((profile?.username || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const newEmail = `${trimmed}@minigames.local`;
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email: newEmail });
    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();
const codeToRoom = new Map();

function genCode() {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  if (codeToRoom.has(s)) return genCode();
  return s;
}

io.on('connection', (socket) => {
  socket.currentRoom = null;

  socket.on('create_room', (cb) => {
    const roomId = randomUUID();
    const code = genCode();
    codeToRoom.set(code, roomId);
    rooms.set(roomId, { code, hostId: socket.id, players: new Set([socket.id]) });
    socket.currentRoom = roomId;
    socket.join(roomId);
    socket.isHost = true;
    cb({ roomId, code });
  });

  socket.on('join_by_code', (code, cb) => {
    const up = (code || '').toString().toUpperCase().trim();
    const roomId = codeToRoom.get(up);
    if (!roomId || !rooms.has(roomId)) {
      cb({ error: 'Invalid or expired code' });
      return;
    }
    const r = rooms.get(roomId);
    if (r.players.size >= 2) {
      cb({ error: 'Room is full' });
      return;
    }
    r.players.add(socket.id);
    socket.currentRoom = roomId;
    socket.join(roomId);
    socket.isHost = false;
    io.to(roomId).emit('lobby_update', { count: r.players.size });
    cb({ roomId, code: r.code });
  });

  socket.on('join_room', (roomId) => {
    if (socket.currentRoom) socket.leave(socket.currentRoom);
    socket.join(roomId);
    socket.currentRoom = roomId;
  });

  socket.on('state', (data) => {
    if (socket.currentRoom) io.to(socket.currentRoom).emit('state', data);
  });

  socket.on('input', (data) => {
    if (socket.currentRoom) socket.to(socket.currentRoom).emit('input', data);
  });

  socket.on('peer_username', (name) => {
    if (socket.currentRoom) socket.to(socket.currentRoom).emit('peer_username', name);
  });

  socket.on('claim_medkit', (data) => {
    if (socket.currentRoom) socket.to(socket.currentRoom).emit('claim_medkit', data);
  });

  socket.on('claim_upgrade', (data) => {
    if (socket.currentRoom) socket.to(socket.currentRoom).emit('claim_upgrade', data);
  });

  socket.on('buy_stat', (data) => {
    if (socket.currentRoom) socket.to(socket.currentRoom).emit('buy_stat', data);
  });

  socket.on('host_left', () => {
    if (socket.currentRoom) io.to(socket.currentRoom).emit('host_left');
  });

  socket.on('peer_left', () => {
    if (socket.currentRoom) socket.to(socket.currentRoom).emit('peer_left');
  });

  socket.on('game_starting', (data) => {
    if (socket.currentRoom) io.to(socket.currentRoom).emit('game_starting', data);
  });

  socket.on('leave_lobby', () => {
    const roomId = socket.currentRoom;
    if (roomId && rooms.has(roomId)) {
      const r = rooms.get(roomId);
      r.players.delete(socket.id);
      if (r.players.size === 0) {
        codeToRoom.delete(r.code);
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit('lobby_update', { count: r.players.size });
      }
    }
    socket.currentRoom = null;
    socket.isHost = false;
  });

  socket.on('disconnect', () => {
    const roomId = socket.currentRoom;
    if (roomId) {
      const uuid = typeof roomId === 'string' && roomId.startsWith('crumb_room:') ? roomId.replace(/^crumb_room:/, '') : roomId;
      const r = rooms.get(uuid);
      if (r && r.hostId === socket.id) {
        io.to(roomId).emit('host_left');
      }
      if (r) {
        r.players.delete(socket.id);
        if (r.players.size === 0) {
          codeToRoom.delete(r.code);
          rooms.delete(uuid);
        } else {
          io.to(roomId).emit('lobby_update', { count: r.players.size });
        }
      }
    }
    socket.currentRoom = null;
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket server on port ${PORT}`);
});
