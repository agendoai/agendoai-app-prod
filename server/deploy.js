// Script simplificado para produção (deploy)
// Executar com: node server/deploy.js

// Importações necessárias
import express from "express";
import { createServer } from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Configura __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Carrega as variáveis .env
import dotenv from "dotenv";
dotenv.config();

// Criação da aplicação Express
const app = express();

// Configuração de CORS
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
  credentials: true, // Aceitar credenciais para compatibilidade
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Middleware CORS manual para garantir compatibilidade
app.use((req, res, next) => {
  // Sempre permitir credenciais
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Permitir origens específicas
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'https://agendoai-app-prod-6qoh.vercel.app',
    'https://app.tbsnet.com.br'
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  // Headers necessários
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  // Responder imediatamente para OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Configuração para servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(rootDir, 'uploads')));

// Importar as rotas API
import { registerRoutes } from "./routes.js";

(async () => {
  // Registrar as rotas da API
  const server = await registerRoutes(app);

  // Tratamento de erros global
  app.use((err, _req, res, _next) => {
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

  // Verificar cliente para servir arquivos estáticos
  const clientDir = path.join(rootDir, 'client');
  const clientSrcDir = path.join(clientDir, 'src');
  const clientIndexPath = path.join(clientDir, 'index.html');
  
  if (fs.existsSync(clientDir) && fs.existsSync(clientIndexPath)) {
    // Servir arquivos estáticos do cliente
    app.use(express.static(clientDir));
    
    // Servir arquivos do src para desenvolvimento simplificado
    if (fs.existsSync(clientSrcDir)) {
      app.use('/src', express.static(clientSrcDir));
    }
    
    // Catch-all para rotas do cliente
    app.get('*', (req, res) => {
      res.sendFile(clientIndexPath);
    });
  } else {
    // Fallback se não encontrar os arquivos do cliente
    app.get('*', (req, res) => {
      res.status(200).send('<h1>AgendoAI API Server</h1><p>Client files not found. This is an API-only instance.</p>');
    });
  }

  // Usar porta configurada para compatibilidade com o deployment
  const port = process.env.PORT || 4020;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    console.log(`Server running on port ${port} in production mode`);
  });
})();