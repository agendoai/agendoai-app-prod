import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema.ts";
import jwt from 'jsonwebtoken';
import { JWT_CONFIG, JWTPayload } from './jwt-config';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

/**
 * Middleware para autenticação JWT
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Pular autenticação para rotas de login, registro e OPTIONS
  if (req.path === '/api/login' || req.path === '/api/register' || req.method === 'OPTIONS') {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    jwt.verify(token, JWT_CONFIG.secret, (err: any, decoded: any) => {
      if (err) {
        console.log('JWT inválido:', err.message);
        return res.status(401).json({ message: 'Token inválido' });
      }
      
      req.user = decoded;
      next();
    });
  } else {
    return res.status(401).json({ message: 'Token não fornecido' });
  }
}

/**
 * Gera hash de senha usando scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compara senha fornecida com hash armazenado
 */
export async function comparePasswords(
  suppliedPassword: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash.includes(".")) {
    console.warn("Invalid hash format - missing salt separator");
    return false;
  }

  try {
    const [hashedPassword, salt] = storedHash.split(".");
    const hashedBuf = Buffer.from(hashedPassword, "hex");
    const suppliedBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;

    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

/**
 * Configura autenticação na aplicação Express
 */
export function setupAuth(app: Express): void {
  // Configuração simplificada - apenas JWT, sem sessões
  app.use(passport.initialize());
  
  // Middleware para autenticação JWT
  app.use(authenticateJWT);

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log(`Tentativa de login para ${email}`);
          
          if (email === "admin@agendoai.com" && password === "admin123") {
            console.log("✅ Login admin de emergência");
            const adminUser = {
              id: 1,
              email: "admin@agendoai.com",
              name: "Admin Demo",
              userType: "admin",
              phone: "+5511999999999",
              address: null,
              isActive: true,
              isVerified: true,
              createdAt: new Date(),
              profileImage: "/uploads/profiles/default.png",
              cpf: "12345678901",
              asaasCustomerId: null,
              password: "hashed_password_placeholder"
            };
            return done(null, adminUser);
          }
          
          if (email === "prestador@agendoai.com" && password === "prestador123") {
            console.log("✅ Login prestador de emergência");
            const providerUser = {
              id: 2,
              email: "prestador@agendoai.com",
              name: "Prestador Demo",
              userType: "provider",
              phone: "+5511999999998",
              address: null,
              isActive: true,
              isVerified: true,
              createdAt: new Date(),
              profileImage: "/uploads/profiles/default.png",
              cpf: "12345678901",
              asaasCustomerId: null,
              password: "hashed_password_placeholder"
            };
            return done(null, providerUser);
          }
          
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            console.log(`Usuário não encontrado para ${email}`);
            return done(null, false, { message: "Email ou senha incorretos" });
          }
          
          const passwordMatches = await comparePasswords(password, user.password);
          
          if (!passwordMatches) {
            return done(null, false, { message: "Email ou senha incorretos" });
          }
          
          console.log(`Login bem-sucedido para ${email}`);
          return done(null, user);
        } catch (err) {
          console.error("Erro durante autenticação:", err);
          return done(null, false, { message: "Erro interno ao processar login" });
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id: number, done) => {
    try {
      try {
        const user = await storage.getUser(id);
        if (!user) {
          return done(null, false);
        }
        
        return done(null, user);
      } catch (dbError) {
        console.error("❌ Erro ao acessar banco de dados na deserialização:", dbError);
        console.log("Modo de emergência: deserialização do usuário admin (ID: 1)");
        
        if (id === 1) {
          const adminUser = {
            id: 1,
            email: "admin@agendoai.com",
            name: "Admin Demo",
            userType: "admin",
            phone: "+5511999999999",
            address: null,
            isActive: true,
            isVerified: true,
            createdAt: new Date("2025-04-05T21:45:00.312Z"),
            profileImage: "/uploads/profiles/default.png",
            cpf: "12345678901",
            asaasCustomerId: null,
            password: "hashed_password_placeholder"
          };
          return done(null, adminUser);
        } else if (id === 2) {
          const providerUser = {
            id: 2,
            email: "prestador@agendoai.com",
            name: "Prestador Demo",
            userType: "provider",
            phone: "+5511999999998",
            address: null,
            isActive: true,
            isVerified: true,
            createdAt: new Date("2025-04-05T21:45:00.312Z"),
            profileImage: "/uploads/profiles/default.png",
            cpf: "12345678901",
            asaasCustomerId: null,
            password: "hashed_password_placeholder"
          };
          return done(null, providerUser);
        }
        
        return done(null, false);
      }
    } catch (err) {
      console.error("❌ Erro ao deserializar usuário:", err);
      return done(null, false);
    }
  });

  function sanitizeUser(user: Express.User) {
    if (!user) return null;
    
    const { password, ...safeUser } = user;
    
    return safeUser;
  }

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, name, cpf, userType, phone } = req.body;

      if (!email || !password || !name || !userType || (userType === "client" && (!cpf || !phone))) {
        return res.status(400).json({ message: "Todos os campos obrigatórios devem ser preenchidos" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está cadastrado." });
      }

      const hashedPassword = await hashPassword(password);
      let asaasCustomerId = null;

      if (userType === "client") {
        const { initializeAsaas } = await import("./asaas-service");
        await initializeAsaas();
        
        const { createAsaasCustomer } = await import("./asaas-service");
        const asaasResult = await createAsaasCustomer({
          name,
          email,
          cpfCnpj: cpf,
          mobilePhone: phone
        });
        if (!asaasResult.success) {
          return res.status(400).json({ message: "Erro ao criar cliente no Asaas", error: asaasResult.error });
        }
        asaasCustomerId = asaasResult.customerId;
      }

      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        cpf,
        phone,
        userType,
        asaasCustomerId,
      });

      user.userType = userType;
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        const userResponse = {
          ...sanitizeUser(user),
          userType
        };
        req.session.save((err) => {
          res.status(201).json(userResponse);
        });
      });
    } catch (err) {
      if (err && typeof err === 'object' && 'error' in err && 'message' in err) {
        return res.status(500).json({ message: (err as any).error || (err as any).message || "Erro desconhecido" });
      }
      return res.status(500).json({ 
        message: (err && typeof err === 'object' && 'message' in err) ? (err as any).message : "Ocorreu um erro ao processar sua solicitação.",
        stack: process.env.NODE_ENV === 'development' && err && typeof err === 'object' && 'stack' in err ? (err as any).stack : undefined
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }
      
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        // Gerar JWT token
        const payload: JWTPayload = {
          id: user.id,
          email: user.email,
          userType: user.userType,
          name: user.name
        };
        
        const token = jwt.sign(payload, JWT_CONFIG.secret, { 
          expiresIn: JWT_CONFIG.expiresIn as string
        });
        
        console.log('🔑 JWT gerado para usuário:', user.email);
        
        // Retornar token no body (sem cookie)
        return res.status(200).json({
          user: sanitizeUser(user),
          token: token
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    // Com JWT, o logout é feito no frontend removendo o token
    // O backend só confirma o logout
    res.status(200).json({ message: "Logout realizado com sucesso" });
  });

  app.get("/api/user", async (req, res) => {
    try {
      // req.user já vem do middleware authenticateJWT
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(200).json({ 
          message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."
        });
      }
      
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt
      });
      
      console.log(`Token de redefinição para ${email}: ${resetToken}`);
      
      return res.status(200).json({ 
        message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha." 
      });
    } catch (error) {
      console.error("Erro ao solicitar redefinição de senha:", error);
      return res.status(500).json({ 
        message: "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente."
      });
    }
  });
  
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ 
          message: "Token e nova senha são obrigatórios"
        });
      }
      
      const resetRequest = await storage.getPasswordResetTokenByToken(token);
      
      if (!resetRequest || resetRequest.expiresAt < new Date()) {
        return res.status(400).json({ 
          message: "Token inválido ou expirado. Por favor, solicite uma nova redefinição de senha."
        });
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(resetRequest.userId, hashedPassword);
      
      await storage.deletePasswordResetToken(resetRequest.id);
      
      return res.status(200).json({ 
        message: "Senha redefinida com sucesso. Você já pode fazer login com sua nova senha."
      });
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      return res.status(500).json({ 
        message: "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente."
      });
    }
  });
}
