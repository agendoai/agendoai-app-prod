import fs from 'fs';
import path from 'path';

// Função para aplicar correção robusta de CORS
function fixCORSInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Padrão 1: Substituir configuração de CORS existente
    const corsPattern1 = /app\.use\(cors\(\{[^}]*\}\)\);/g;
    if (corsPattern1.test(content)) {
      content = content.replace(corsPattern1, `app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'https://agendoai-app-prod-6qoh.vercel.app',
    'https://app.tbsnet.com.br',
    'https://*.tbsnet.com.br',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));`);
      modified = true;
    }

    // Padrão 2: Adicionar middleware CORS manual se não existir
    const corsMiddlewarePattern = /res\.header\('Access-Control-Allow-Credentials'/;
    if (!corsMiddlewarePattern.test(content)) {
      // Encontrar onde inserir o middleware (após o CORS principal)
      const insertAfter = content.indexOf('app.use(cors(');
      if (insertAfter !== -1) {
        const endOfCors = content.indexOf('});', insertAfter) + 3;
        const corsMiddleware = `

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
});`;

        content = content.slice(0, endOfCors) + corsMiddleware + content.slice(endOfCors);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ CORS corrigido em: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  Nenhuma mudança necessária em: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Aplicar correção em todos os arquivos de servidor
const serverFiles = [
  'server/index.ts',
  'server/production.ts',
  'server/deploy.js'
];

console.log('🔧 Aplicando correção robusta de CORS...\n');

let totalModified = 0;
serverFiles.forEach(file => {
  if (fs.existsSync(file)) {
    if (fixCORSInFile(file)) {
      totalModified++;
    }
  } else {
    console.log(`⚠️  Arquivo não encontrado: ${file}`);
  }
});

console.log(`\n✅ Concluído! ${totalModified} arquivos foram modificados.`);
console.log('🔄 Agora reinicie o servidor para aplicar as mudanças.');
console.log('🚀 Use: node server/deploy.js ou npm run start:prod');
