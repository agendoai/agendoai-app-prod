/**
 * Configurações específicas para compatibilidade com iOS Safari
 * 
 * O iOS Safari tem restrições mais rigorosas para cookies e CORS
 */

export const iosCompatibilityConfig = {
  // Configurações de cookie para iOS
  cookie: {
    // iOS Safari requer configurações específicas para cookies cross-domain
    sameSite: 'lax', // Mais permissivo para iOS
    secure: false, // Permitir HTTP para desenvolvimento
    httpOnly: true,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
  },
  
  // Headers específicos para iOS
  headers: {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Expose-Headers': 'Set-Cookie',
  },
  
  // Configurações de sessão para iOS
  session: {
    resave: true,
    saveUninitialized: true,
    name: 'agendoai.sid'
  }
};

/**
 * Detecta se a requisição vem de um dispositivo iOS
 */
export function isIOSDevice(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent);
}

/**
 * Aplica configurações específicas para iOS
 */
export function applyIOSCompatibility(req: any, res: any, next: any) {
  const userAgent = req.headers['user-agent'] || '';
  
  if (isIOSDevice(userAgent)) {
    // Aplicar headers específicos para iOS
    Object.entries(iosCompatibilityConfig.headers).forEach(([key, value]) => {
      res.header(key, value);
    });
    
    // Log para debugging
    console.log('🔧 Configurações iOS aplicadas para:', req.path);
  }
  
  next();
}
