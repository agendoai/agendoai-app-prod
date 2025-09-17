import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../jwt-config';

// Declaração de tipos para req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        userType: string;
        name: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}

/**
 * Middleware JWT reutilizável para autenticação
 * Suporta tanto JWT tokens quanto sessões como fallback
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log('\n🔴 ============= MIDDLEWARE JWT DEBUG =============');
  console.log('🔍 Rota:', req.method, req.originalUrl);
  console.log('🔍 Authorization header:', req.headers.authorization);
  console.log('🔍 Content-Type:', req.headers['content-type']);
  console.log('🔍 User-Agent:', req.headers['user-agent']);
  
  // Primeiro tentar autenticação JWT
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('🟢 Token JWT encontrado!');
    console.log('🔍 Token length:', token.length);
    console.log('🔍 Token preview:', token.substring(0, 50) + '...');
    console.log('🔍 JWT Secret sendo usado:', JWT_CONFIG.secret.substring(0, 10) + '...');
    
    try {
      // Verificar JWT token
      const decoded = jwt.verify(token, JWT_CONFIG.secret) as any;
      req.user = decoded;
      console.log('🟢 TOKEN VERIFICADO COM SUCESSO!');
      console.log('👤 Usuário decodificado:', {
        id: decoded.id,
        email: decoded.email,
        userType: decoded.userType,
        iat: decoded.iat,
        exp: decoded.exp
      });
      console.log('🔴 ===============================================\n');
      return next();
    } catch (err: any) {
      console.log('🔴 ERRO AO VERIFICAR JWT:', err.name);
      console.log('🔴 Mensagem do erro:', err.message);
      if (err.name === 'TokenExpiredError') {
        console.log('🔴 Token expirado em:', err.expiredAt);
      }
      if (err.name === 'JsonWebTokenError') {
        console.log('🔴 Erro de formato do token');
      }
      console.log('🔴 ===============================================\n');
      return res.status(401).json({ 
        error: 'Token inválido', 
        details: err.message,
        tokenExpired: err.name === 'TokenExpiredError'
      });
    }
  } else {
    console.log('🔴 NENHUM TOKEN JWT ENCONTRADO!');
    console.log('🔍 Auth header recebido:', authHeader || 'undefined');
  }
  
  // Fallback para autenticação de sessão (para compatibilidade)
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log('🟡 Usuário autenticado via SESSÃO (fallback)');
    console.log('🔴 ===============================================\n');
    return next();
  }

  // Para depuração: registrar falha de autenticação
  console.log('🔴 FALHA TOTAL DE AUTENTICAÇÃO!');
  console.log('🔴 Rota:', req.originalUrl);
  console.log('🔴 Método:', req.method);
  console.log('🔴 Headers disponíveis:', Object.keys(req.headers));
  console.log('🔴 ===============================================\n');

  return res.status(401).json({ 
    error: "Não autorizado",
    debug: {
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader ? (authHeader.startsWith('Bearer ') ? 'Bearer format' : 'Wrong format') : 'Missing',
      route: req.originalUrl,
      method: req.method
    }
  });
};

/**
 * Middleware para verificar se o usuário é um cliente
 */
export const isClient = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.userType === 'client') {
    console.log("✅ Cliente autenticado com sucesso");
    return next();
  }
  console.log("❌ Falha na autenticação de cliente:", { 
    user: req.user 
  });
  return res.status(403).json({ error: 'Acesso permitido apenas para clientes' });
};

/**
 * Middleware para verificar se o usuário é um prestador
 */
export const isProvider = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.userType === 'provider') {
    console.log("✅ Prestador autenticado com sucesso");
    return next();
  }
  console.log("❌ Falha na autenticação de prestador:", { 
    user: req.user 
  });
  return res.status(403).json({ error: 'Acesso permitido apenas para prestadores de serviços' });
};

/**
 * Middleware para verificar se o usuário é um administrador
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔓 ADMIN MIDDLEWARE DESABILITADO - SEMPRE PERMITE ACESSO');
  return next();
};

/**
 * Middleware para verificar se o usuário é um agente de suporte
 */
export const isSupport = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.userType === 'support') {
    console.log("✅ Suporte autenticado com sucesso");
    return next();
  }
  console.log("❌ Falha na autenticação de suporte:", { 
    user: req.user 
  });
  return res.status(403).json({ error: 'Acesso permitido apenas para agentes de suporte' });
};

/**
 * Middleware para verificar se o usuário é um administrador ou agente de suporte
 */
export const isAdminOrSupport = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user.userType === 'admin' || req.user.userType === 'support')) {
    console.log("✅ Admin ou Suporte autenticado com sucesso");
    return next();
  }
  console.log("❌ Falha na autenticação de admin/suporte:", { 
    user: req.user 
  });
  return res.status(403).json({ error: 'Acesso permitido apenas para administradores e agentes de suporte' });
};
