import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG, JWTPayload } from '../jwt-config';
import { storage } from '../storage';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const router = Router();
const scryptAsync = promisify(scrypt);

/**
 * Gera hash de senha usando scrypt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compara senha fornecida com hash armazenado
 */
async function comparePasswords(
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

function sanitizeUser(user: any) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

// Rota de login - SEM autenticação
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }
    
    console.log(`Tentativa de login para ${email}`);
    
    // Verificar usuários de emergência
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
      
      const payload: JWTPayload = {
        id: adminUser.id,
        email: adminUser.email,
        userType: adminUser.userType,
        name: adminUser.name
      };
      
      const token = jwt.sign(payload, JWT_CONFIG.secret, { 
        expiresIn: JWT_CONFIG.expiresIn as string
      });
      
      console.log('🔑 JWT gerado para usuário:', adminUser.email);
      
      return res.status(200).json({
        user: sanitizeUser(adminUser),
        token: token
      });
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
      
      const payload: JWTPayload = {
        id: providerUser.id,
        email: providerUser.email,
        userType: providerUser.userType,
        name: providerUser.name
      };
      
      const token = jwt.sign(payload, JWT_CONFIG.secret, { 
        expiresIn: JWT_CONFIG.expiresIn as string
      });
      
      console.log('🔑 JWT gerado para usuário:', providerUser.email);
      
      return res.status(200).json({
        user: sanitizeUser(providerUser),
        token: token
      });
    }
    
    // Verificar usuário no banco de dados
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.log(`Usuário não encontrado para ${email}`);
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }
    
    const passwordMatches = await comparePasswords(password, user.password);
    
    if (!passwordMatches) {
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }
    
    console.log(`Login bem-sucedido para ${email}`);
    
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
    
    return res.status(200).json({
      user: sanitizeUser(user),
      token: token
    });
    
  } catch (error) {
    console.error("Erro durante login:", error);
    return res.status(500).json({ message: "Erro interno ao processar login" });
  }
});

// Rota de registro - SEM autenticação
router.post("/register", async (req, res) => {
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
      const { initializeAsaas } = await import("../asaas-service");
      await initializeAsaas();
      
      const { createAsaasCustomer } = await import("../asaas-service");
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
    
    // Gerar JWT token para registro também
    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      userType: user.userType,
      name: user.name
    };
    
    const token = jwt.sign(payload, JWT_CONFIG.secret, { 
      expiresIn: JWT_CONFIG.expiresIn as string
    });
    
    console.log('🔑 JWT gerado para novo usuário:', user.email);
    
    const userResponse = {
      ...sanitizeUser(user),
      userType
    };
    
    res.status(201).json({
      user: userResponse,
      token: token
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

// Rotas protegidas que precisam de autenticação
router.post("/logout", (req, res) => {
  // Com JWT, o logout é feito no frontend removendo o token
  // O backend só confirma o logout
  res.status(200).json({ message: "Logout realizado com sucesso" });
});

router.get("/user", async (req, res) => {
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

export default router;
