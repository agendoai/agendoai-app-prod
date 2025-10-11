import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG, JWTPayload } from '../jwt-config';
import { storage } from '../storage';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { authenticateJWT } from '../auth';

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
    if (email === "admin@agendoai.com.br" && password === "123456") {
      console.log("✅ Login admin de emergência");
      const adminUser = {
        id: 1,
        email: "admin@agendoai.com.br",
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
    
    // Verificar se a conta está ativa
    if (!user.isActive) {
      console.log(`Tentativa de login com conta desativada para ${email}`);
      return res.status(403).json({ 
        message: "Esta conta foi desativada. Entre em contato com o suporte se precisar reativar sua conta." 
      });
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

    if (!email || !password || !name || !userType || ((userType === "client" || userType === "provider") && (!cpf || !phone))) {
      return res.status(400).json({ message: "Todos os campos obrigatórios devem ser preenchidos" });
    }

    // Validação básica de CPF/CNPJ para clientes e providers
    function validateCpfCnpj(value: string): boolean {
      const cleanValue = (value || '').replace(/\D/g, '');
      return cleanValue.length === 11 || cleanValue.length === 14;
    }

    const cleanedCpf = (cpf || '').replace(/\D/g, '');
    
    // Validar CPF/CNPJ para clientes e providers
    if (userType === "client" || userType === "provider") {
      if (!cpf) {
        return res.status(400).json({ message: "CPF/CNPJ é obrigatório." });
      }
      
      if (!validateCpfCnpj(cpf)) {
        return res.status(400).json({ message: "CPF/CNPJ inválido." });
      }
      
      // Verificar unicidade do CPF/CNPJ
      const existingByCpf = await storage.getUserByCpf(cleanedCpf);
      if (existingByCpf) {
        return res.status(400).json({ message: "Este CPF/CNPJ já está cadastrado." });
      }
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
        cpfCnpj: cleanedCpf,
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
      cpf: userType === "client" || userType === "provider" ? cleanedCpf : null,
      phone: userType === "client" || userType === "provider" ? phone : null,
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

// Rotas para validação em tempo real
router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email é obrigatório" });
    }
    
    const existingUser = await storage.getUserByEmail(email);
    
    return res.status(200).json({ 
      exists: !!existingUser,
      message: existingUser ? "Email já cadastrado" : "Email disponível"
    });
  } catch (error) {
    console.error("Erro ao verificar email:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

router.post("/check-cpf", async (req, res) => {
  try {
    const { cpf } = req.body;
    
    if (!cpf) {
      return res.status(400).json({ message: "CPF é obrigatório" });
    }
    
    const cleanedCpf = cpf.replace(/\D/g, '');
    const existingUser = await storage.getUserByCpf(cleanedCpf);
    
    return res.status(200).json({ 
      exists: !!existingUser,
      message: existingUser ? "CPF já cadastrado" : "CPF disponível"
    });
  } catch (error) {
    console.error("Erro ao verificar CPF:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Rotas protegidas que precisam de autenticação
router.post("/logout", (req, res) => {
  // Com JWT, o logout é feito no frontend removendo o token
  // O backend só confirma o logout
  res.status(200).json({ message: "Logout realizado com sucesso" });
});

router.get("/user", authenticateJWT, async (req, res) => {
  try {
    console.log('🔍 /api/user - req.user:', req.user);
    
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    
    console.log('✅ /api/user - Usuário encontrado:', user.email);
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export default router;
