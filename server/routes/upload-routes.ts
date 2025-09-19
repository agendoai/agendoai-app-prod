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
import { isAuthenticated, isAdmin } from "../middleware/jwt-auth";
import { cloudinary } from "../cloudinary-config";
import multer from "multer";

export function registerUploadRoutes(app: Express) {
  // Middleware específico para interceptar uploads ANTES de qualquer processamento
  app.use('/api/users/:userId/profile-image-cloudinary', (req, res, next) => {
    console.log('🔍 Upload middleware - Content-Type:', req.headers['content-type']);
    console.log('🔍 Upload middleware - Method:', req.method);
    console.log('🔍 Upload middleware - URL:', req.url);
    
    // Se for FormData, não processar como JSON
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log('🔍 FormData detectado - pulando processamento JSON');
      // Limpar qualquer processamento anterior do body
      req.body = {};
    }
    
    next();
  });

  // Configurar multer para upload em memória (para Cloudinary)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Apenas arquivos de imagem são permitidos'));
      }
    }
  });

  // Middleware para verificar se o usuário é proprietário ou administrador
  const isOwnerOrAdmin = (userId: number) => (req: Request, res: Response, next: Function) => {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    const user = req.user;
    if (user.id === userId || user.userType === 'admin') {
      return next();
    }
    
    return res.status(403).json({ error: "Sem permissão para esta operação" });
  };

  // Upload de imagem de perfil usando Cloudinary
  app.post('/api/users/:userId/profile-image-cloudinary', isAuthenticated, upload.single('image'), async (req: Request, res: Response) => {
    try {
      console.log('🔍 Upload route - Content-Type:', req.headers['content-type']);
      console.log('🔍 Upload route - Body keys:', Object.keys(req.body || {}));
      console.log('🔍 Upload route - File:', req.file ? 'Present' : 'Missing');
      
      const userId = parseInt(req.params.userId);
      console.log('🔍 Upload route - User ID:', userId);
      console.log('🔍 Upload route - Authenticated user:', req.user?.id);
      
      // Verificar permissão
      if (req.user && (req.user.id !== userId && req.user.userType !== 'admin')) {
        console.log('❌ Upload route - Permission denied');
        return res.status(403).json({ error: "Sem permissão para esta operação" });
      }
      
      if (!req.file) {
        console.log('❌ Upload route - No file provided');
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      
      console.log('📤 Upload route - Starting Cloudinary upload...');
      
      // Upload para Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'agendoai/profile-images',
            public_id: `user_${userId}_${Date.now()}`,
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('✅ Cloudinary upload success:', result?.secure_url);
              resolve(result);
            }
          }
        ).end(req.file.buffer);
      });
      
      const cloudinaryResult = result as any;
      console.log('💾 Upload route - Updating user in storage...');
      
      // Atualizar o perfil do usuário com a nova URL da imagem
      const updateResult = await storage.updateUser(userId, { profileImage: cloudinaryResult.secure_url });
      console.log('✅ Upload route - User updated:', updateResult ? 'Success' : 'Failed');
      
      // Buscar usuário atualizado
      const updatedUser = await storage.getUser(userId);
      console.log('📋 Upload route - Retrieved updated user:', updatedUser ? 'Success' : 'Failed');
      
      const responseData = { 
        success: true, 
        profileImage: cloudinaryResult.secure_url,
        user: updatedUser
      };
      
      console.log('📤 Upload route - Sending success response');
      return res.status(200).json(responseData);
      
    } catch (error) {
      console.error('❌ Erro no upload da imagem para Cloudinary:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return res.status(500).json({ 
        error: "Erro ao processar imagem",
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Upload de imagem de capa para prestadores usando Cloudinary
  app.post('/api/providers/:providerId/cover-image-cloudinary', isAuthenticated, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.providerId);
      
      // Verificar permissão
      if (req.user && (req.user.id !== providerId && req.user.userType !== 'admin')) {
        return res.status(403).json({ error: "Sem permissão para esta operação" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      
      // Upload para Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'agendoai/cover-images',
            public_id: `provider_${providerId}_cover_${Date.now()}`,
            transformation: [
              { width: 1200, height: 400, crop: 'fill', gravity: 'center' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });
      
      const cloudinaryResult = result as any;
      
      // Atualizar as configurações do prestador com a nova URL da imagem de capa
      await storage.updateProviderSettings(providerId, { coverImage: cloudinaryResult.secure_url });
      
      return res.status(200).json({ 
        success: true, 
        coverImage: cloudinaryResult.secure_url
      });
      
    } catch (error) {
      console.error('Erro no upload da imagem de capa para Cloudinary:', error);
      return res.status(500).json({ error: "Erro ao processar imagem de capa" });
    }
  });

  // Upload de imagem de perfil (método antigo - mantido para compatibilidade)
  app.post('/api/users/:userId/profile-image', (req: Request, res: Response) => {
    // Verificar autenticação
    if (!req.user) {
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
        // Buscar usuário atualizado
        const updatedUser = await storage.getUser(userId);
        
        // Excluir imagem antiga se existir
        if (oldImagePath) {
          await deleteFile(oldImagePath);
        }
        
        return res.status(200).json({ 
          success: true, 
          profileImage: publicUrl,
          user: updatedUser
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
    if (!req.user) {
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