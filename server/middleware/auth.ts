import { Request, Response, NextFunction } from 'express';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../jwt-config';

// Middleware para verificar se o usuário está autenticado
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Primeiro, verificar se já temos req.user (vindo do middleware JWT)
  if (req.user) {
    console.log("Usuário autenticado via JWT:", req.user);
    return next();
  }

  // Verificar token JWT no header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer '
    
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.secret) as any;
      req.user = decoded;
      console.log("Usuário autenticado via JWT token:", decoded);
      return next();
    } catch (error) {
      console.log("Token JWT inválido:", error);
      return res.status(401).json({ error: 'Token inválido' });
    }
  }

  // Fallback: verificar sessão (método antigo)
  if (req.session.user || req.isAuthenticated()) {
    console.log("Usuário autenticado via sessão");
    return next();
  }

  console.log("Falha na autenticação:", { 
    sessionUser: req.session.user, 
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
    hasAuthHeader: !!authHeader
  });
  return res.status(401).json({ error: 'Usuário não autenticado' });
};

// Middleware para verificar se o usuário é um prestador de serviços
export const isProvider = (req: Request, res: Response, next: NextFunction) => {
  // Verifica tanto req.session.user (método padrão) quanto req.user (passport/deserialização de emergência)
  if ((req.session.user && req.session.user.userType === 'provider') || 
      (req.user && req.user.userType === 'provider')) {
    console.log("Prestador autenticado com sucesso");
    return next();
  }
  console.log("Falha na autenticação de prestador:", { 
    sessionUser: req.session.user, 
    passportUser: req.user 
  });
  return res.status(403).json({ error: 'Acesso permitido apenas para prestadores de serviços' });
};

// Middleware para verificar se o usuário é um cliente
export const isClient = (req: Request, res: Response, next: NextFunction) => {
  // Verifica tanto req.session.user (método padrão) quanto req.user (passport/deserialização de emergência)
  if ((req.session.user && req.session.user.userType === 'client') || 
      (req.user && req.user.userType === 'client')) {
    console.log("Cliente autenticado com sucesso");
    return next();
  }
  console.log("Falha na autenticação de cliente:", { 
    sessionUser: req.session.user, 
    passportUser: req.user 
  });
  return res.status(403).json({ error: 'Acesso permitido apenas para clientes' });
};

// Middleware para verificar se o usuário é um administrador
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Verifica tanto req.session.user (método padrão) quanto req.user (passport/deserialização de emergência)
  if ((req.session.user && req.session.user.userType === 'admin') || 
      (req.user && req.user.userType === 'admin')) {
    console.log("Admin autenticado com sucesso");
    return next();
  }
  console.log("Falha na autenticação de admin:", { 
    sessionUser: req.session.user, 
    passportUser: req.user 
  });
  return res.status(403).json({ error: 'Acesso permitido apenas para administradores' });
};

// Middleware para verificar se o usuário é um agente de suporte
export const isSupport = (req: Request, res: Response, next: NextFunction) => {
  // Verifica tanto req.session.user (método padrão) quanto req.user (passport/deserialização de emergência)
  if ((req.session.user && req.session.user.userType === 'support') || 
      (req.user && req.user.userType === 'support')) {
    console.log("Suporte autenticado com sucesso");
    return next();
  }
  console.log("Falha na autenticação de suporte:", { 
    sessionUser: req.session.user, 
    passportUser: req.user 
  });
  return res.status(403).json({ error: 'Acesso permitido apenas para agentes de suporte' });
};

// Middleware para verificar se o usuário é um administrador ou agente de suporte
export const isAdminOrSupport = (req: Request, res: Response, next: NextFunction) => {
  // Verifica tanto req.session.user (método padrão) quanto req.user (passport/deserialização de emergência)
  if ((req.session.user && (req.session.user.userType === 'admin' || req.session.user.userType === 'support')) || 
      (req.user && (req.user.userType === 'admin' || req.user.userType === 'support'))) {
    console.log("Admin ou Suporte autenticado com sucesso");
    return next();
  }
  console.log("Falha na autenticação de admin/suporte:", { 
    sessionUser: req.session.user, 
    passportUser: req.user 
  });
  return res.status(403).json({ error: 'Acesso permitido apenas para administradores e agentes de suporte' });
};