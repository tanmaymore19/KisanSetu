import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { app } from './server/app.js';

const PORT = 3000;

async function startServer() {
  // Serve uploaded or bundled static assets
  const instrumentsDir = fs.existsSync(path.join(process.cwd(), 'public', 'instruments'))
    ? path.join(process.cwd(), 'public', 'instruments')
    : path.join(process.cwd(), 'dist', 'instruments');
  app.use('/instruments', express.static(instrumentsDir));

  // --- Vite Middleware for Development / Static for Production ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Farm2Home Server running on http://0.0.0.0:${PORT}`);
  });
}

// Start HTTP server in persistent server environments (Cloud Run / Local dev)
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export { app };
export default app;
