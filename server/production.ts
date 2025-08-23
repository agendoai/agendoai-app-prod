// Este arquivo é uma versão simplificada de index.ts para produção
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import cors from "cors";

const app = express();

// Configurar CORS para permitir requisições da origem do deploy e produção
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'https://agendoai-app-prod-6qoh.vercel.app',
    'https://app.tbsnet.com.br',
    'https://*.tbsnet.com.br',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: false, // Não precisamos de credenciais para JWT
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Configuração para servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

(async () => {
  const server = await registerRoutes(app);

  // Tratamento de erros global
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error("Erro no middleware global:", {
      status,
      message,
      stack: err.stack
    });

    if (!res.headersSent) {
      return res.status(status).json({ 
        error: message,
        status,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Rota catch-all para APIs
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found', path: req.originalUrl });
  });

  // Servir arquivos estáticos do cliente
  const clientPath = path.join(process.cwd(), 'client');
  app.use(express.static(clientPath));
  
  // Catch-all para rotas do cliente
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  // Usar porta configurada para compatibilidade com o deployment
  const port = process.env.PORT || 4020;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    console.log(`Server running on port ${port} in production mode`);
  });
})();