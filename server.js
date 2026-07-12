import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure database directory exists if needed, but it's just in the root
const db = new Database('database.sqlite');
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// API Endpoints
app.get('/api/state/:key', (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(req.params.key);
    res.json(row ? JSON.parse(row.value) : null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/state/:key', (req, res) => {
  try {
    const { key } = req.params;
    const value = JSON.stringify(req.body);
    
    db.prepare(`
      INSERT INTO app_state (key, value) 
      VALUES (?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
    
    // Broadcast to all clients
    io.emit('state-updated', { key, value: req.body });
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected via Socket.io');
  
  socket.on('update-state', (data) => {
    try {
      db.prepare(`
        INSERT INTO app_state (key, value) 
        VALUES (?, ?) 
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(data.key, JSON.stringify(data.value));
      
      // Broadcast to EVERYONE ELSE except the sender
      socket.broadcast.emit('state-updated', data);
    } catch (err) {
      console.error('Socket update error', err);
    }
  });
});

// Serve static files in production
const distPath = join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // For React Router or SPA fallback
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next(); // skip api routes
    res.sendFile(join(distPath, 'index.html'));
  });
}

server.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
