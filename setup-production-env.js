#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conteúdo do arquivo .env para produção
const productionEnvContent = `# API Configuration - PRODUÇÃO
VITE_API_URL=https://app.tbsnet.com.br

# Frontend URL - PRODUÇÃO
VITE_FRONTEND_URL=https://agendoai-app-prod-6qoh.vercel.app

# Stripe Configuration (opcional)
# VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key_here

# Push Notifications (opcional)
# VAPID_PUBLIC_KEY=your_vapid_public_key
# VAPID_PRIVATE_KEY=your_vapid_private_key
`;

const clientEnvPath = path.join(__dirname, 'client', '.env');

try {
  // Verificar se o arquivo .env já existe
  if (fs.existsSync(clientEnvPath)) {
    console.log('⚠️  Arquivo client/.env já existe!');
    console.log('Sobrescrevendo com configurações de PRODUÇÃO...');
  }
  
  // Criar/sobrescrever o arquivo .env
  fs.writeFileSync(clientEnvPath, productionEnvContent);
  
  console.log('✅ Arquivo client/.env configurado para PRODUÇÃO!');
  console.log('📁 Localização:', clientEnvPath);
  console.log('');
  console.log('🔧 Configurações de PRODUÇÃO:');
  console.log('   - VITE_API_URL=https://app.tbsnet.com.br (backend)');
  console.log('   - VITE_FRONTEND_URL=https://agendoai-app-prod-6qoh.vercel.app (frontend)');
  console.log('');
  console.log('🚀 Para fazer deploy:');
  console.log('   1. Commit as mudanças');
  console.log('   2. Push para o repositório');
  console.log('   3. O Vercel fará deploy automaticamente');
  console.log('');
  console.log('⚠️  IMPORTANTE:');
  console.log('   - Todas as chamadas API serão feitas para https://app.tbsnet.com.br');
  console.log('   - O frontend será servido pelo Vercel');
  console.log('   - Certifique-se de que o backend está rodando em produção');

} catch (error) {
  console.error('❌ Erro ao criar arquivo client/.env:', error.message);
}
