/**
 * Rotas para gerenciamento de usuários
 * 
 * Este arquivo implementa endpoints para gerenciamento de usuários,
 * incluindo alteração de senha, atualização de perfil, e recuperação de senha.
 */

import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import { emailService } from "../email-service";

const scryptAsync = promisify(scrypt);

// Esquema de validação para alteração de senha
const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6)
});

// Esquema de validação para recuperação de senha
const forgotPasswordSchema = z.object({
  email: z.string().email()
});

// Esquema de validação para redefinição de senha
const resetPasswordSchema = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(6)
});

// Utilitários para hash de senha
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware para verificar se o usuário é proprietário ou administrador
const isOwnerOrAdmin = (userId: number) => (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  
  const user = req.user;
  if (user.id === userId || user.userType === 'admin') {
    return next();
  }
  
  return res.status(403).json({ error: "Sem permissão para esta operação" });
};

// Registrar as rotas
export function registerUserManagementRoutes(app: Express) {
  
  // Alterar senha do usuário
  app.put("/api/users/:id/password", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verificar permissões
      const isOwnerOrAdminResult = isOwnerOrAdmin(userId)(req, res, () => {});
      if (isOwnerOrAdminResult !== undefined) {
        return isOwnerOrAdminResult;
      }
      
      // Validar dados
      const validationResult = changePasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validationResult.error.format() 
        });
      }
      
      const { oldPassword, newPassword } = validationResult.data;
      
      // Buscar usuário
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      // Verificar senha atual
      const passwordValid = await comparePasswords(oldPassword, user.password);
      if (!passwordValid) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }
      
      // Hash e atualizar nova senha
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedNewPassword });
      
      return res.json({ success: true, message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      return res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });
  
  // Rota para solicitar recuperação de senha
  app.post("/api/forgot-password", async (req: Request, res: Response) => {
    try {
      // Validar dados
      const validationResult = forgotPasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validationResult.error.format() 
        });
      }
      
      const { email } = validationResult.data;
      
      // Verificar se email existe
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Por segurança, não informamos que o email não existe
        return res.json({ 
          success: true, 
          message: "Se o email existir, um link de recuperação será enviado" 
        });
      }
      
      // Gerar token de recuperação
      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token válido por 1 hora
      
      // Salvar token no banco
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt: resetTokenExpiry
      });
      
      // Enviar email com link de recuperação
      const resetLink = `${process.env.FRONTEND_URL || "http://localhost:4020"}/reset-password?token=${resetToken}`;
      
      // Enviar email - ajustando parâmetros de acordo com a implementação existente
      await emailService.sendPasswordReset(email, user.name, resetLink);
      
      return res.json({ 
        success: true, 
        message: "Se o email existir, um link de recuperação será enviado" 
      });
    } catch (error) {
      console.error("Erro ao solicitar recuperação de senha:", error);
      return res.status(500).json({ error: "Erro ao processar solicitação de recuperação de senha" });
    }
  });
  
  // Rota para redefinir senha com token
  app.post("/api/reset-password", async (req: Request, res: Response) => {
    try {
      // Validar dados
      const validationResult = resetPasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validationResult.error.format() 
        });
      }
      
      const { token, newPassword } = validationResult.data;
      
      // Verificar se token existe e é válido
      const passwordReset = await storage.getPasswordResetTokenByToken(token);
      if (!passwordReset) {
        return res.status(400).json({ error: "Token inválido ou expirado" });
      }
      
      // Verificar se token ainda é válido
      const now = new Date();
      if (now > passwordReset.expiresAt) {
        return res.status(400).json({ error: "Token expirado" });
      }
      
      // Hash e atualizar nova senha
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUser(passwordReset.userId, { password: hashedNewPassword });
      
      // Invalidar token usado
      await storage.deletePasswordResetToken(passwordReset.id);
      
      return res.json({ success: true, message: "Senha redefinida com sucesso" });
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      return res.status(500).json({ error: "Erro ao redefinir senha" });
    }
  });
  
  // Atualizar perfil do usuário
  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verificar permissões
      const isOwnerOrAdminResult = isOwnerOrAdmin(userId)(req, res, () => {});
      if (isOwnerOrAdminResult !== undefined) {
        return isOwnerOrAdminResult;
      }
      
      // Dados que podem ser atualizados
      const allowedFields = ['name', 'email', 'phone', 'bio', 'preferences'];
      const updateData: any = {};
      
      // Filtrar apenas campos permitidos
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      // Verificar se há dados para atualizar
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "Nenhum dado válido para atualização" });
      }
      
      // Atualizar usuário
      const updatedUser = await storage.updateUser(userId, updateData);
      
      return res.json(updatedUser);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      return res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });
}