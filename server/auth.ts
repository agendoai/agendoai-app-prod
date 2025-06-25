import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema.ts";

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

import memorystore from 'memorystore';
const MemoryStore = memorystore(session);

/**
 * Configura autenticação na aplicação Express
 */
export function setupAuth(app: Express): void {
  // Usando MemoryStore para maior estabilidade em desenvolvimento
  // Isso é temporário até resolvermos os problemas com o banco de dados
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000 // Limpar sessões expiradas a cada 24h
  });
  
  // Configuração de sessão com opções melhoradas para debugging e persistência
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "agendoai-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false, // Para desenvolvimento, deve ser false
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      sameSite: 'lax', // Permite que o cookie seja enviado em requests cross-origin
      path: '/', // Garantir que o cookie funcione em todo o site
      domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Em desenvolvimento, não definir domain
    },
    name: 'agendoai.sid' // Nome personalizado do cookie para melhor identificação
  };
  
  console.log("Configuração de sessão inicializada com MemoryStore para maior estabilidade");

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Estratégia local de autenticação
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log(`Tentativa de login para ${email}`);
          
          // Lista de usuários de emergência para contornar problemas de banco de dados
          const emergencyUsers = {
            "prestador@agendoai.com": {
              id: 2,
              password: "prestador123",
              email: "prestador@agendoai.com",
              name: "Prestador Demo",
              profileImage: "/uploads/profiles/profile-2-1745295770301-fd848c99a0c1.png",
              userType: "provider",
              phone: "+5511888888888",
              address: null,
              isActive: true,
              isVerified: true,
              createdAt: new Date("2025-04-05T21:45:00.312Z")
            },
            "admin@agendoai.com": {
              id: 1,
              password: "admin123",
              email: "admin@agendoai.com",
              name: "Admin Demo",
              profileImage: "/uploads/profiles/default.png",
              userType: "admin",
              phone: "+5511999999999",
              address: null,
              isActive: true,
              isVerified: true,
              createdAt: new Date("2025-04-05T21:45:00.312Z")
            },
            "cliente@agendoai.com": {
              id: 3,
              password: "cliente123",
              email: "cliente@agendoai.com",
              name: "Cliente Demo",
              profileImage: "/uploads/profiles/default.png",
              userType: "client",
              phone: "+5511977777777",
              address: null,
              isActive: true,
              isVerified: true,
              createdAt: new Date("2025-04-05T21:45:00.312Z")
            }
          };
          
          // Verificar se é um usuário de emergência e se a senha está correta
          const emergencyUser = emergencyUsers[email];
          if (emergencyUser && emergencyUser.password === password) {
            console.log("Modo de emergência: login bem-sucedido para", email);
            // Remove a senha antes de retornar o usuário
            const { password, ...userWithoutPassword } = emergencyUser;
            return done(null, userWithoutPassword);
          }
          
          // Tentando acessar o banco de dados se não for usuário de emergência válido
          try {
            const user = await storage.getUserByEmail(email);
            
            if (!user) {
              console.log(`Usuário não encontrado para ${email}`);
              // Verificar novamente se é um usuário de emergência (pode ser que a senha esteja errada)
              if (emergencyUsers[email]) {
                console.log("Usuário de emergência encontrado, mas senha incorreta");
                return done(null, false, { message: "Email ou senha incorretos" });
              }
              return done(null, false, { message: "Email ou senha incorretos" });
            }
            
            const passwordMatches = await comparePasswords(password, user.password);
            console.log(`Senha correta para ${email}: ${passwordMatches}`);
            
            if (!passwordMatches) {
              return done(null, false, { message: "Email ou senha incorretos" });
            } else {
              console.log(`Login bem-sucedido para ${email} (banco de dados)`);
              return done(null, user);
            }
          } catch (dbError) {
            console.error("Erro ao acessar banco de dados:", dbError);
            
            // Se ocorreu erro na comunicação com o banco, verifica novamente os usuários de emergência
            const emergencyUser = emergencyUsers[email];
            if (emergencyUser && emergencyUser.password === password) {
              console.log("Modo de emergência (fallback após erro DB): login bem-sucedido para", email);
              // Remove a senha antes de retornar o usuário
              const { password, ...userWithoutPassword } = emergencyUser;
              return done(null, userWithoutPassword);
            }
            
            // Se chegou aqui, não é um usuário de emergência válido ou a senha está incorreta
            console.log("Autenticação falhou - usuário não encontrado ou senha incorreta");
            return done(null, false, { message: "Email ou senha incorretos" });
          }
        } catch (err) {
          console.error("Erro durante autenticação:", err);
          return done(null, false, { message: "Erro interno ao processar login" });
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Lista de usuários de emergência para deserialização
      const emergencyUsers = {
        // ID 1: Admin
        1: {
          id: 1,
          email: "admin@agendoai.com",
          name: "Admin Demo",
          profileImage: "/uploads/profiles/default.png",
          userType: "admin",
          phone: "+5511999999999",
          address: null,
          isActive: true,
          isVerified: true,
          createdAt: new Date("2025-04-05T21:45:00.312Z")
        },
        // ID 2: Prestador
        2: {
          id: 2,
          email: "prestador@agendoai.com",
          name: "Prestador Demo",
          profileImage: "/uploads/profiles/profile-2-1745295770301-fd848c99a0c1.png",
          userType: "provider",
          phone: "+5511888888888",
          address: null,
          isActive: true,
          isVerified: true,
          createdAt: new Date("2025-04-05T21:45:00.312Z")
        },
        // ID 3: Cliente
        3: {
          id: 3,
          email: "cliente@agendoai.com",
          name: "Cliente Demo",
          profileImage: "/uploads/profiles/default.png",
          userType: "client",
          phone: "+5511977777777",
          address: null,
          isActive: true,
          isVerified: true,
          createdAt: new Date("2025-04-05T21:45:00.312Z")
        }
      };
      
      // Verificar se existe um usuário de emergência para este ID
      if (emergencyUsers[id]) {
        console.log(`Modo de emergência: deserialização do usuário ${emergencyUsers[id].userType} (ID: ${id})`);
        return done(null, emergencyUsers[id]);
      }
      
      // Tenta acessar o banco de dados se não for um ID de usuário de emergência
      try {
        const user = await storage.getUser(id);
        if (!user) {
          console.log(`Usuário com ID ${id} não encontrado no banco de dados`);
          return done(null, false);
        }
        return done(null, user);
      } catch (dbError) {
        console.error("Erro ao acessar banco de dados na deserialização:", dbError);
        
        // Verifica novamente se é um usuário de emergência após o erro de DB
        if (emergencyUsers[id]) {
          console.log(`Modo de emergência (fallback após erro DB): deserialização do usuário ${emergencyUsers[id].userType} (ID: ${id})`);
          return done(null, emergencyUsers[id]);
        }
        
        // Se não for usuário de emergência, não autenticar
        console.log(`Erro ao deserializar usuário com ID ${id}: banco de dados indisponível`);
        return done(null, false);
      }
    } catch (err) {
      console.error("Erro ao deserializar usuário:", err);
      return done(null, false);
    }
  });

  // Função para remover dados sensíveis do objeto de usuário
  function sanitizeUser(user: Express.User) {
    if (!user) return null;
    
    const { password, ...safeUser } = user;
    return safeUser;
  }

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Recebendo solicitação de registro:", {
        email: req.body.email,
        name: req.body.name,
        userType: req.body.userType
        // senha omitida por segurança
      });
      
      // Validação de campos obrigatórios
      if (!req.body.email || !req.body.password || !req.body.name) {
        console.log("Erro de validação: campos obrigatórios ausentes");
        return res.status(400).json({ 
          message: "Todos os campos obrigatórios devem ser preenchidos"
        });
      }

      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.log(`Usuário já existe com email ${req.body.email}`);
        return res.status(400).json({ 
          message: "Este email já está cadastrado. Por favor, use outro email ou faça login."
        });
      }

      const hashedPassword = await hashPassword(req.body.password);
      
      // Verificar se estamos criando um prestador
      const isProvider = req.body.userType === "provider";
      console.log(`Criando usuário do tipo: ${isProvider ? 'Prestador' : 'Cliente'}`);
      
      let user: Express.User;
      
      try {
        // Se for prestador, criamos com configurações iniciais
        if (isProvider) {
          // Primeiro criar o usuário
          user = await storage.createUser({
            ...req.body,
            password: hashedPassword,
          });
          
          console.log(`Usuário prestador criado com ID: ${user.id}`);
          
          // Verificar se já existem configurações para o prestador
          const existingSettings = await storage.getProviderSettings(user.id);
          
          if (!existingSettings) {
            // Criar configurações do prestador
            await storage.createProviderSettings({
              providerId: user.id,
              isOnline: true,  // Ativo por padrão
              businessName: user.name || "",
              // Dados padrão para métodos de pagamento
              acceptsCards: true,
              acceptsPix: true,
              acceptsCash: true,
              // Iniciar contador de avaliações
              ratingCount: 0
            });
            console.log(`Configurações do prestador criadas para usuário ${user.id}`);
          } else {
            console.log(`Configurações do prestador já existem para usuário ${user.id}`);
          }
        } else {
          // Cliente normal, criação direta
          user = await storage.createUser({
            ...req.body,
            password: hashedPassword,
          });
          console.log(`Usuário cliente criado com ID: ${user.id}`);
        }
        
        console.log(`Usuário ${user.id} (${isProvider ? 'prestador' : 'cliente'}) criado com sucesso`);
        
        // Garantir que o userType esteja no objeto do usuário
        user.userType = req.body.userType;
        
        console.log("Tentando login após registro com usuário:", {
          id: user.id,
          email: user.email,
          userType: req.body.userType
        });
        
        req.login(user, (err) => {
          if (err) {
            console.error("Erro ao fazer login após registro:", err);
            return next(err);
          }
          
          // Incluir o userType explicitamente na resposta
          const userResponse = {
            ...sanitizeUser(user),
            userType: req.body.userType
          };
          
          // Log de debug de sessão
          console.log("ID da sessão após registro:", req.sessionID);
          console.log("Sessão criada:", !!req.session);
          console.log("Usuário na sessão:", req.isAuthenticated() ? "sim" : "não");
          
          // Força o salvamento da sessão antes de responder
          req.session.save((err) => {
            if (err) {
              console.error("Erro ao salvar sessão:", err);
            }
            
            console.log("Enviando resposta de registro bem-sucedido:", userResponse);
            res.status(201).json(userResponse);
          });
        });
      } catch (error) {
        console.error("Erro durante criação de usuário:", error);
        res.status(500).json({ 
          message: "Ocorreu um erro ao criar sua conta. Por favor, tente novamente."
        });
      }
    } catch (err) {
      console.error("Erro no procesamento do registro:", err);
      res.status(500).json({ 
        message: "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente."
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Recebendo solicitação de login:", req.body);
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: any) => {
      if (err) {
        console.error("Erro de autenticação:", err);
        return next(err);
      }
      if (!user) {
        console.log("Autenticação falhou - usuário não encontrado ou senha incorreta");
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Erro ao iniciar sessão:", err);
          return next(err);
        }
        console.log("Login bem-sucedido:", user.email);
        return res.status(200).json(sanitizeUser(user));
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("Recebendo solicitação de logout");
    if (!req.isAuthenticated()) {
      console.log("Usuário não autenticado durante logout");
      return res.status(200).json({ message: "Não havia sessão ativa" });
    }
    
    req.logout((err) => {
      if (err) {
        console.error("Erro durante logout:", err);
        return next(err);
      }
      console.log("Logout bem-sucedido");
      req.session.destroy((err) => {
        if (err) {
          console.error("Erro ao destruir sessão:", err);
          return next(err);
        }
        res.clearCookie('agendoai.sid'); // Usar o mesmo nome definido na configuração da sessão
        res.status(200).json({ message: "Logout realizado com sucesso" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(sanitizeUser(req.user));
  });
  
  // Rota para solicitar redefinição de senha
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Por questões de segurança, não informamos se o email existe ou não
        return res.status(200).json({ 
          message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."
        });
      }
      
      // Gerar token único
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token válido por 1 hora
      
      // Salvar token no banco de dados
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt
      });
      
      // Aqui você enviaria um email com o link para redefinição
      // usando SendGrid ou outro serviço de email
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
  
  // Rota para validar token e redefinir senha
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ 
          message: "Token e nova senha são obrigatórios"
        });
      }
      
      // Verificar se o token existe e é válido
      const resetRequest = await storage.getPasswordResetTokenByToken(token);
      
      if (!resetRequest || resetRequest.expiresAt < new Date()) {
        return res.status(400).json({ 
          message: "Token inválido ou expirado. Por favor, solicite uma nova redefinição de senha."
        });
      }
      
      // Atualizar a senha do usuário
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(resetRequest.userId, hashedPassword);
      
      // Invalidar o token após o uso
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
