/**
 * Serviço para gerenciar uploads de arquivos
 * Responsável por configurar o multer e fornecer middleware para 
 * processar diferentes tipos de uploads
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Definir diretórios de upload
const UPLOAD_DIR = './uploads';
const PROFILE_IMAGES_DIR = path.join(UPLOAD_DIR, 'profiles');
const COVER_IMAGES_DIR = path.join(UPLOAD_DIR, 'covers');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');

// Garantir que os diretórios existam
[UPLOAD_DIR, PROFILE_IMAGES_DIR, COVER_IMAGES_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configurar storage para imagens de perfil
const profileImagesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROFILE_IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const fileExt = path.extname(file.originalname);
    cb(null, `profile-${userId}-${uniqueSuffix}${fileExt}`);
  },
});

// Configurar storage para imagens de capa
const coverImagesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, COVER_IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const fileExt = path.extname(file.originalname);
    cb(null, `cover-${userId}-${uniqueSuffix}${fileExt}`);
  },
});

// Filtro para permitir apenas imagens
const imageFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Apenas JPEG, PNG, GIF e WEBP são permitidos.'));
  }
};

// Criar upload handlers
export const uploadProfileImage = multer({
  storage: profileImagesStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
}).single('profileImage');

export const uploadCoverImage = multer({
  storage: coverImagesStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: imageFilter,
}).single('coverImage');

// Função para excluir arquivo
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      return resolve();
    }

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(fullPath)) {
      return resolve();
    }
    
    fs.unlink(fullPath, (err) => {
      if (err) {
        console.error(`Erro ao excluir arquivo ${fullPath}:`, err);
        return reject(err);
      }
      resolve();
    });
  });
};

// Função para obter URL pública do arquivo
export const getPublicUrl = (filePath: string): string => {
  if (!filePath) return '';
  
  // Remover o ./ do início do path para criar URL relativa
  let relativePath = filePath.startsWith('./') ? filePath.substring(2) : filePath;
  
  // Converter separadores de caminho para uso em URL
  relativePath = relativePath.replace(/\\/g, '/');
  
  // Adicionar barra inicial se não existir
  return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
};