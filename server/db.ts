import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, or, sql } from 'drizzle-orm';
import * as schema from "@shared/schema.ts";

import dotenv from 'dotenv';

// Carrega variáveis do .env em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Check your .env file or Replit Secrets.",
  );
}

// Configuração do pool PostgreSQL normal
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Aumentado o máximo de conexões no pool
  min: 2, // Manter pelo menos 2 conexões ativas
  connectionTimeoutMillis: 15000, // Timeout de 15 segundos para conectar
  idleTimeoutMillis: 60000, // Aumentado timeout de inatividade para 60 segundos
  allowExitOnIdle: false, // Não fechar o pool em caso de inatividade
  keepAlive: true, // Manter conexões vivas
  keepAliveInitialDelayMillis: 30000, // Delay inicial para keepAlive
});

// Estratégia de reconexão automática
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 5000;

// Ajusta o pool para reiniciar automaticamente em caso de erro
pool.on('error', (err) => {
  console.error('Erro no pool de conexões PostgreSQL:', err);
  
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.info(`Tentativa de reconexão ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
    
    // Aguarda um tempo antes de tentar novamente
    setTimeout(async () => {
      try {
        // Tenta executar uma query simples para verificar conexão
        await pool.query('SELECT 1');
        console.info('Reconexão bem-sucedida ao banco de dados');
        reconnectAttempts = 0;
      } catch (reconnectError) {
        console.error('Falha na tentativa de reconexão:', reconnectError);
      }
    }, RECONNECT_DELAY_MS);
  } else {
    console.error(`Máximo de tentativas de reconexão (${MAX_RECONNECT_ATTEMPTS}) atingido.`);
    console.error('O sistema continuará operando com dados em cache quando possível.');
  }
});

export const db = drizzle({ client: pool, schema });
export { eq, and, or, sql };
