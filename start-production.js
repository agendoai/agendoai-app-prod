#!/usr/bin/env node

/**
 * Script para iniciar a aplicação em ambiente de produção
 * Este script é usado pelo Replit para iniciar o servidor em modo de produção
 * Não requer build prévio, iniciando diretamente com tsx
 */

import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Determina o diretório atual para ESM
const __dirname = dirname(fileURLToPath(import.meta.url));

// Define o ambiente como produção
process.env.NODE_ENV = 'production';

console.log('Iniciando servidor em modo de produção...');

// Inicia o servidor usando tsx (permitindo TypeScript em produção sem build)
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'production' }
});

// Manipula eventos do processo do servidor
serverProcess.on('error', (error) => {
  console.error('Erro ao iniciar o servidor:', error.message);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`O servidor encerrou com código de saída ${code}`);
    process.exit(code);
  }
});

// Manipula sinais para encerramento limpo
process.on('SIGINT', () => {
  console.log('Recebido SIGINT, encerrando servidor...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM, encerrando servidor...');
  serverProcess.kill('SIGTERM');
});