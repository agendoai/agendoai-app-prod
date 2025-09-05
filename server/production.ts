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

// Middleware global para interceptar TODAS as requisições de upload ANTES dos parsers
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  const isUploadRoute = req.path.includes('profile-image-cloudinary') || 
                       req.path.includes('cover-image-cloudinary');
  
  if (isUploadRoute && contentType.includes('multipart/form-data')) {
    console.log('🔍 FormData detectado - pulando TODOS os parsers de body');
    console.log('🔍 Route:', req.path);
    console.log('🔍 Method:', req.method);
    console.log('🔍 Content-Type:', contentType);
    
    // Marcar que este request não deve ser processado pelos parsers
    (req as any).skipBodyParsing = true;
    return next();
  }
  
  next();
});

// Parser JSON - APENAS para Content-Type: application/json
app.use((req, res, next) => {
  // Pular se for requisição de upload
  if ((req as any).skipBodyParsing) {
    console.log('🔍 Pulando parser JSON - requisição de upload');
    return next();
  }
  
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    express.json({ limit: '10mb' })(req, res, next);
  } else {
    next();
  }
});

// Parser URL encoded - APENAS para Content-Type: application/x-www-form-urlencoded
app.use((req, res, next) => {
  // Pular se for requisição de upload
  if ((req as any).skipBodyParsing) {
    console.log('🔍 Pulando parser URL encoded - requisição de upload');
    return next();
  }
  
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    express.urlencoded({ extended: false })(req, res, next);
  } else {
    next();
  }
});

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