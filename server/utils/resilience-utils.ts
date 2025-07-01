/**
 * Utilitários para aumentar a resiliência do sistema
 * Fornece mecanismos de cache e fallback para operações críticas
 */

import { setTimeout } from 'timers/promises';

// Armazenamento em memória para cache
const memoryCache: Record<string, { data: any; timestamp: number }> = {};

// Tempo de expiração do cache (10 minutos)
const CACHE_TTL = 10 * 60 * 1000; 

// Não usamos mais serviços artificiais, apenas os reais cadastrados pelo admin
export const essentialServiceTemplates = [];

// Lista de categorias essenciais
export const essentialCategories = [
  {
    id: 1,
    name: "Lava-rápido",
    description: "Serviços de lavagem e limpeza de veículos",
    nicheId: 1,
    icon: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: "Mecânica",
    description: "Serviços de manutenção e reparo mecânico",
    nicheId: 1,
    icon: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Lista de nichos essenciais
export const essentialNiches = [
  {
    id: 1,
    name: "Automotivo",
    description: "Serviços para veículos",
    icon: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * Executa uma função com retry automático
 * @param fn Função a ser executada
 * @param maxRetries Número máximo de tentativas
 * @param delay Atraso entre tentativas (ms)
 * @param backoffFactor Fator de aumento do delay entre tentativas
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoffFactor: number = 2
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`Tentativa ${attempt + 1}/${maxRetries + 1} falhou:`, error);
      
      if (attempt < maxRetries) {
        const retryDelay = delay * Math.pow(backoffFactor, attempt);
        console.info(`Aguardando ${retryDelay}ms antes da próxima tentativa...`);
        await setTimeout(retryDelay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Executa uma função com fallback em caso de erro
 * @param mainFn Função principal
 * @param fallbackFn Função de fallback
 */
export async function withFallback<T>(
  mainFn: () => Promise<T>,
  fallbackFn: () => Promise<T> | T
): Promise<T> {
  try {
    return await mainFn();
  } catch (error) {
    console.warn('Função principal falhou, executando fallback:', error);
    return await Promise.resolve(fallbackFn());
  }
}

/**
 * Executa uma função com cache
 * @param key Chave para o cache
 * @param fn Função a ser executada
 * @param ttl Tempo de vida do cache (ms)
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = CACHE_TTL
): Promise<T> {
  const now = Date.now();
  
  // Verificar se há dados em cache válidos
  if (memoryCache[key] && now - memoryCache[key].timestamp < ttl) {
    console.log(`Usando dados em cache para '${key}'`);
    return memoryCache[key].data;
  }
  
  // Executar função e armazenar resultado em cache
  try {
    const result = await fn();
    memoryCache[key] = { data: result, timestamp: now };
    return result;
  } catch (error) {
    // Se já existe cache expirado, use-o em caso de erro
    if (memoryCache[key]) {
      console.warn(`Erro na função, usando cache expirado para '${key}':`, error);
      return memoryCache[key].data;
    }
    throw error;
  }
}

/**
 * Executa uma função com cache e fallback
 * @param key Chave para o cache
 * @param fn Função a ser executada
 * @param fallbackFn Função de fallback
 * @param ttl Tempo de vida do cache (ms)
 */
export async function withCacheAndFallback<T>(
  key: string,
  fn: () => Promise<T>,
  fallbackFn: () => Promise<T> | T,
  ttl: number = CACHE_TTL
): Promise<T> {
  try {
    return await withCache(key, fn, ttl);
  } catch (error) {
    console.warn(`Cache e função principal falharam para '${key}', usando fallback:`, error);
    return await Promise.resolve(fallbackFn());
  }
}

/**
 * Adiciona itens essenciais a uma lista existente
 * @param existingItems Lista existente
 * @param essentialItems Itens essenciais para adicionar
 * @param compareField Campo para comparação (para evitar duplicatas)
 */
export function addEssentialItems<T>(
  existingItems: T[],
  essentialItems: T[],
  compareField: keyof T
): T[] {
  const result = [...existingItems];
  
  for (const item of essentialItems) {
    const exists = existingItems.some(
      existing => existing[compareField] === item[compareField]
    );
    
    if (!exists) {
      result.push(item);
    }
  }
  
  return result;
}

/**
 * Força a limpeza do cache para uma chave
 * Suporta expressões regulares para limpar múltiplos caches com padrão
 * @param key Chave do cache para limpar ou padrão regex
 */
export function clearCache(key: string): void {
  // Verificar se é um padrão com curingas (ex: 'provider-*')
  if (key.includes('*')) {
    const pattern = new RegExp(key.replace('*', '.*'));
    let count = 0;
    
    Object.keys(memoryCache).forEach(cacheKey => {
      if (pattern.test(cacheKey)) {
        delete memoryCache[cacheKey];
        count++;
      }
    });
    
    if (count > 0) {
      console.log(`${count} caches correspondentes ao padrão '${key}' foram limpos`);
    }
    return;
  }
  
  // Limpar cache específico
  if (memoryCache[key]) {
    delete memoryCache[key];
    console.log(`Cache limpo para '${key}'`);
  }
}

/**
 * Força a limpeza de todo o cache
 */
export function clearAllCache(): void {
  Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
  console.log('Todo o cache foi limpo');
}