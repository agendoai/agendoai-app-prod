import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";

// Função de log simples para o servidor
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
import cors from "cors";
import { DatabaseStorage, storage } from './storage';
import * as storageEnhancements from './services/storage-enhancements';
import { initializeAsaas } from './asaas-service';

// Estender a classe DatabaseStorage com os novos métodos em batch
if (storage instanceof DatabaseStorage) {
  // @ts-ignore - Adicionando métodos em batch
  DatabaseStorage.prototype.getServicesByIds = storageEnhancements.getServicesByIds;
  // @ts-ignore - Adicionando métodos em batch
  DatabaseStorage.prototype.getCategoriesByIds = storageEnhancements.getCategoriesByIds;
  // @ts-ignore - Adicionando métodos em batch
  DatabaseStorage.prototype.getNichesByIds = storageEnhancements.getNichesByIds;
}

const app = express();

// Inicializar Asaas no início do servidor
(async () => {
  try {
    await initializeAsaas();
    console.log('Asaas inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar Asaas:', error);
  }
})();

// Configurar CORS - Permitir origens específicas incluindo produção
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origem (como mobile apps ou Postman)
    if (!origin) {
      console.log('🌐 CORS: Requisição sem origem permitida');
      return callback(null, true);
    }
    
    console.log('🌐 CORS: Verificando origem:', origin);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'https://agendoai-app-prod-6qoh.vercel.app',
      'https://app.tbsnet.com.br',
      'https://www.agendoai.pagina-oficial.com',
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ];
    
    // Permitir qualquer subdomínio do tbsnet.com.br
    if (origin.includes('tbsnet.com.br')) {
      console.log('🌐 CORS: Origem tbsnet.com.br permitida');
      return callback(null, true);
    }
    
    // Permitir qualquer subdomínio do vercel.app
    if (origin.includes('vercel.app')) {
      console.log('🌐 CORS: Origem vercel.app permitida');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('🌐 CORS: Origem na lista permitida');
      return callback(null, true);
    }
    
    console.log('🚫 CORS bloqueado para origem:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Aceitar credenciais para compatibilidade
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware para debug de CORS e responder OPTIONS
app.use((req, res, next) => {
  console.log('🌐 CORS Debug:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type']
  });
  
  // Garantir que o header de credenciais seja sempre 'true'
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Responder imediatamente para requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    console.log('🔄 Respondendo OPTIONS preflight');
    return res.status(200).end();
  }
  
  next();
});

// CORS já configurado acima



// Log para debugging
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
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

// Configuração do parser JSON com tratamento de erros - APENAS para Content-Type: application/json
app.use((req, res, next) => {
  // Pular se for requisição de upload
  if ((req as any).skipBodyParsing) {
    console.log('🔍 Pulando parser JSON - requisição de upload');
    return next();
  }
  
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    express.json({
      limit: '10mb',
      verify: (req : Request, res, buf, encoding) => {
        try {
          JSON.parse(buf.toString(encoding as BufferEncoding));
        } catch (e) {
          console.error('Erro de parsing JSON:', e);
          req.body = { _jsonParseError: e instanceof Error ? e.message : 'Formato JSON inválido' };
        }
      }
    })(req, res, next);
  } else {
    next();
  }
});

// Middleware para capturar erros de parsing JSON e retornar resposta JSON apropriada
app.use((req, res, next) => {
  if (req.body && req.body._jsonParseError) {
    return res.status(400).json({
      error: 'Erro ao processar JSON da requisição',
      details: req.body._jsonParseError
    });
  }
  next();
});

// Configuração do parser URL encoded - APENAS para Content-Type: application/x-www-form-urlencoded
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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

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

  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found', path: req.originalUrl });
  });

  // Remover a configuração do Vite para rodar apenas o backend
  // const backendOnly = process.argv.includes('--backend-only');
  
  // if (app.get("env") === "development" && !backendOnly) {
  //   await setupVite(app, server);
  // } else {
  //   serveStatic(app);
  // }

  const port = parseInt(process.env.PORT || '5000', 10);

  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
