/**
 * Rotas para upload de arquivos
 * Este arquivo define as rotas para upload de imagens de perfil e capa
 */

import { Express, Router, Request, Response } from "express";
import { storage } from "../storage";
import {
  uploadProfileImage,
  uploadCoverImage,
  getPublicUrl,
  deleteFile
} from "../upload-service";

export function registerUploadRoutes(app: Express) {
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

  // Upload de imagem de perfil
  app.post('/api/users/:userId/profile-image', (req: Request, res: Response) => {
    // Verificar autenticação
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    const userId = parseInt(req.params.userId);
    
    // Verificar permissão
    if (req.user && (req.user.id !== userId && req.user.userType !== 'admin')) {
      return res.status(403).json({ error: "Sem permissão para esta operação" });
    }
    
    uploadProfileImage(req, res, async (err) => {
      if (err) {
        console.error('Erro no upload da imagem de perfil:', err);
        return res.status(400).json({ error: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      
      try {
        // Obter caminho da imagem antiga
        const user = await storage.getUser(userId);
        const oldImagePath = user?.profileImage;
        
        // Atualizar o perfil do usuário com o novo caminho da imagem
        const filePath = req.file.path;
        const publicUrl = getPublicUrl(filePath);
        
        await storage.updateUser(userId, { profileImage: publicUrl });
        
        // Excluir imagem antiga se existir
        if (oldImagePath) {
          await deleteFile(oldImagePath);
        }
        
        return res.status(200).json({ 
          success: true, 
          profileImage: publicUrl 
        });
      } catch (error) {
        console.error('Erro ao atualizar perfil com nova imagem:', error);
        // Em caso de erro, excluir o arquivo que acabou de ser carregado
        if (req.file) {
          await deleteFile(req.file.path);
        }
        return res.status(500).json({ error: "Erro ao processar imagem" });
      }
    });
  });
  
  // Upload de imagem de capa para prestadores
  app.post('/api/providers/:providerId/cover-image', (req: Request, res: Response) => {
    // Verificar autenticação
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    const providerId = parseInt(req.params.providerId);
    
    // Verificar permissão
    if (req.user && (req.user.id !== providerId && req.user.userType !== 'admin')) {
      return res.status(403).json({ error: "Sem permissão para esta operação" });
    }
    
    uploadCoverImage(req, res, async (err) => {
      if (err) {
        console.error('Erro no upload da imagem de capa:', err);
        return res.status(400).json({ error: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      
      try {
        // Obter configurações atuais do prestador
        const providerSettings = await storage.getProviderSettings(providerId);
        
        if (!providerSettings) {
          return res.status(404).json({ error: "Configurações do prestador não encontradas" });
        }
        
        const oldCoverPath = providerSettings.coverImage;
        
        // Atualizar as configurações do prestador com a nova imagem de capa
        const filePath = req.file.path;
        const publicUrl = getPublicUrl(filePath);
        
        await storage.updateProviderSettings(providerSettings.id, { coverImage: publicUrl });
        
        // Excluir imagem antiga se existir
        if (oldCoverPath) {
          await deleteFile(oldCoverPath);
        }
        
        return res.status(200).json({ 
          success: true, 
          coverImage: publicUrl 
        });
      } catch (error) {
        console.error('Erro ao atualizar imagem de capa:', error);
        // Em caso de erro, excluir o arquivo que acabou de ser carregado
        if (req.file) {
          await deleteFile(req.file.path);
        }
        return res.status(500).json({ error: "Erro ao processar imagem de capa" });
      }
    });
  });
}