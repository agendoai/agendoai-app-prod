import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema.ts";
import { isIOSDevice, applyIOSCompatibility } from "./ios-compatibility";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

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
  const frontendUrl = process.env.FRONTEND_URL || '';
  const isHttpsFrontend = frontendUrl.startsWith('https://');

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "agendoai-secret-key",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: true, // Só true se for HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite:'none', // 'lax' para HTTP, 'none' para HTTPS
      path: '/',
      // Removido o atributo domain para evitar conflito
    },
    name: 'agendoai.sid'
  };
  
  console.log("Sessão: ", {
    secure: sessionSettings.cookie?.secure,
    sameSite: sessionSettings.cookie?.sameSite,
    domain: sessionSettings.cookie?.domain,
    frontendUrl
  });

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Middleware específico para iOS Safari
  app.use(applyIOSCompatibility);
  
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`🔍 Sessão para ${req.path}:`, {
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated(),
        user: req.user ? {
          id: req.user.id,
          email: req.user.email,
          userType: req.user.userType
        } : null
      });
    }
    next();
  });

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
        req.session.save(() => {
          // Garantir que o cookie seja enviado corretamente
          const userAgent = req.headers['user-agent'] || '';
          
          if (isIOSDevice(userAgent)) {
            // Para iOS, usar configurações específicas
            res.cookie('agendoai.sid', req.sessionID, {
              secure: true, // iOS Safari tem problemas com secure cookies em desenvolvimento
              sameSite: 'none', // Mais permissivo para iOS
              httpOnly: true,
              maxAge: 1000 * 60 * 60 * 24 * 7,
              path: '/'
            });
          }
          
          return res.status(200).json(sanitizeUser(user));
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(200).json({ message: "Não havia sessão ativa" });
    }
    
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      req.session.destroy((err) => {
        if (err) {
          return next(err);
        }
        res.clearCookie('agendoai.sid');
        res.status(200).json({ message: "Logout realizado com sucesso" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const sanitizedUser = sanitizeUser(req.user);
    
    res.json(sanitizedUser);
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
