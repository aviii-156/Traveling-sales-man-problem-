// server.ts - Next.js Standalone + Socket.IO (Fixed version)
import { setupSocket } from '@/lib/socket';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import detect from 'detect-port'; // 👈 you'll need to install this

const dev = process.env.NODE_ENV !== 'production';
const DEFAULT_PORT = 3000;
const hostname = 'localhost';

async function createCustomServer() {
  try {
    // 🟢 Automatically find an available port
    const availablePort = await detect(DEFAULT_PORT);
    const currentPort = availablePort || DEFAULT_PORT;

    // Create Next.js app
    const nextApp = next({
      dev,
      dir: process.cwd(),
      conf: dev ? undefined : { distDir: './.next' }
    });

    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    // Create HTTP server
    const server = createServer((req, res) => {
      if (req.url?.startsWith('/api/socketio')) return;
      handle(req, res);
    });

    // Setup Socket.IO
    const io = new Server(server, {
      path: '/api/socketio',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    setupSocket(io);

    // Start the server
    server.listen(currentPort, hostname, () => {
      console.log(`✅ Server ready on: http://${hostname}:${currentPort}`);
      console.log(`🧩 Socket.IO running at: ws://${hostname}:${currentPort}/api/socketio`);
      if (currentPort !== DEFAULT_PORT) {
        console.warn(`⚠️ Port 3000 was busy — using ${currentPort} instead.`);
      }
    });

  } catch (err) {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
}

createCustomServer();
