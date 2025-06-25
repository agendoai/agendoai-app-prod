/**
 * Configuração centralizada para o servidor
 * 
 * Este arquivo contém configurações que podem ser ajustadas para diferentes ambientes
 * (desenvolvimento, produção, teste)
 */

// Determina se estamos em produção
export const isProduction = process.env.NODE_ENV === 'production';

// Configuração de servidor
export const serverConfig = {
  // Porta onde o servidor irá rodar 
  // Em produção, usa a porta definida pelo ambiente, com fallback para 5000
  port: process.env.PORT || 4020,
  
  // Host onde o servidor irá escutar
  // Em produção, escuta em todas as interfaces
  host: '0.0.0.0',
  
  // Configuração de CORS - em produção, restringe origens
  cors: {
    // Em produção, aceita qualquer origem mas poderia ser restringido
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // Limites de JSON parsing
  jsonLimit: '10mb',
};

// Configuração de sessão
export const sessionConfig = {
  // Tempo de expiração da sessão (em segundos) - 7 dias
  maxAge: 60 * 60 * 24 * 7,
  
  // Configurações de cookie de sessão
  cookie: {
    // Em produção, usa HTTPS se disponível
    secure: isProduction && !!process.env.HTTPS,
    
    // Configurações padrão de segurança
    sameSite: isProduction ? 'none' : 'lax',
    httpOnly: true,
    path: '/',
  },
  
  // Outras configurações de sessão
  resave: true,
  saveUninitialized: true,
};

// Configuração de logs
export const logConfig = {
  // Em produção, registra apenas erros e informações importantes
  level: isProduction ? 'info' : 'debug',
  
  // Formato de data nos logs
  dateFormat: 'HH:mm:ss',
};

// Outras configurações específicas do aplicativo
export const appConfig = {
  // Define modo de debug
  debug: !isProduction,
  
  // Caminho de uploads
  uploadsPath: 'uploads',
  
  // Configurações específicas de funcionalidades
  features: {
    enableWebSockets: true,
    enablePushNotifications: true,
    enableChatbot: true,
  },
};