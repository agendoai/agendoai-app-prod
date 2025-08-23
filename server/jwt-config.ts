/**
 * Configurações JWT para autenticação
 */

// Log para debug do JWT secret
console.log('🔐 JWT Config - JWT_SECRET definido:', !!process.env.JWT_SECRET);
console.log('🔐 JWT Config - Usando secret:', process.env.JWT_SECRET ? 'ENV' : 'DEFAULT');

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'agendoai-jwt-secret',
  expiresIn: '7d', // 7 dias
  algorithm: 'HS256' as const,
};

/**
 * Payload padrão do JWT
 */
export interface JWTPayload {
  id: number;
  email: string;
  userType: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Verificar se o token está próximo de expirar
 */
export function isTokenExpiringSoon(exp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = exp - now;
  const oneDay = 24 * 60 * 60; // 1 dia em segundos
  
  return timeUntilExpiry < oneDay;
}
