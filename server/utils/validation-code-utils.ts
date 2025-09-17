import crypto from 'crypto';

/**
 * Gera um código aleatório de 6 dígitos
 * @returns {string} Código de 6 dígitos (ex: "123456")
 */
export function generateValidationCode(): string {
  // Gera um número aleatório entre 100000 e 999999
  const code = Math.floor(Math.random() * 900000) + 100000;
  return code.toString();
}

/**
 * Cria um hash seguro do código de validação usando SHA-256
 * @param {string} code - Código de 6 dígitos
 * @returns {string} Hash do código
 */
export function hashValidationCode(code: string): string {
  // Adiciona um salt fixo para aumentar a segurança
  const salt = process.env.VALIDATION_CODE_SALT || 'agendoai_validation_salt_2024';
  const saltedCode = code + salt;
  
  // Cria hash SHA-256
  return crypto.createHash('sha256').update(saltedCode).digest('hex');
}

/**
 * Verifica se um código fornecido corresponde ao hash armazenado
 * @param {string} providedCode - Código fornecido pelo usuário
 * @param {string} storedHash - Hash armazenado no banco de dados
 * @returns {boolean} True se o código for válido
 */
export function verifyValidationCode(providedCode: string, storedHash: string): boolean {
  // Gera hash do código fornecido
  const providedHash = hashValidationCode(providedCode);
  
  // Compara os hashes de forma segura (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(providedHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}

/**
 * Valida se o código tem o formato correto (6 dígitos)
 * @param {string} code - Código a ser validado
 * @returns {boolean} True se o formato for válido
 */
export function isValidCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Constantes para controle de tentativas
 */
export const VALIDATION_CONFIG = {
  MAX_ATTEMPTS: 3,
  CODE_LENGTH: 6
} as const;