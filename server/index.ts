import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proxyRouter } from './proxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Enable CORS for development Vite frontend (e.g. localhost:5173)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// Mount the API proxy router under /api
app.use('/api', proxyRouter);

// In production, serve the built Vite SPA static assets
const clientDistPath = path.resolve(__dirname, '../dist/client');
app.use(express.static(clientDistPath));

// For SPA routing fallback to index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // If client is not built yet (e.g. during standalone backend testing)
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Senku IPTV Backend</title></head>
          <body style="background:#0a0b10;color:#00ff88;font-family:monospace;padding:2rem;">
            <h1>[ SENKU STREAM GATEWAY ONLINE ]</h1>
            <p>Backend proxy is active on port ${PORT}.</p>
            <p>Run Vite client in dev mode or execute <code>npm run build</code>.</p>
          </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🧪 [SENKU STREAM GATEWAY] ONLINE AT http://0.0.0.0:${PORT}`);
  console.log(`⚡ Proxy API available at /api/xtream, /api/m3u, /api/stream`);
  if (process.env.APP_PASSWORD) {
    console.log(`🔒 Single-user authentication active (APP_PASSWORD)`);
  } else {
    console.log(`🔓 Running in public proxy mode`);
  }
  console.log(`======================================================\n`);
});
