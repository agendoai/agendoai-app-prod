#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Conteúdo do arquivo .env para o cliente
const clientEnvContent = `# API Configuration
VITE_API_URL=http://localhost:5000

# Frontend URL
VITE_FRONTEND_URL=http://localhost:3000

# Stripe Configuration (opcional)
# VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key_here
`;

const clientEnvPath = path.join(__dirname, 'client', '.env');

try {
  // Verificar se o arquivo .env já existe
  if (fs.existsSync(clientEnvPath)) {
    console.log('⚠️  Arquivo client/.env já existe!');
    console.log('Se você quiser sobrescrever, delete o arquivo atual e execute este script novamente.');
  } else {
    // Criar o arquivo .env
    fs.writeFileSync(clientEnvPath, clientEnvContent);
    
    console.log('✅ Arquivo client/.env criado com sucesso!');
    console.log('📁 Localização:', clientEnvPath);
    console.log('');
    console.log('🔧 Configurações incluídas:');
    console.log('   - VITE_API_URL=http://localhost:5000 (backend)');
    console.log('   - VITE_FRONTEND_URL=http://localhost:3000 (frontend)');
    console.log('');
    console.log('🚀 Para iniciar o frontend, execute:');
    console.log('   cd client && npm run dev');
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - O frontend rodará na porta 3000');
    console.log('   - O backend deve estar rodando na porta 5000');
    console.log('   - Todas as chamadas API serão feitas para localhost:5000');
  }

} catch (error) {
  console.error('❌ Erro ao criar arquivo client/.env:', error.message);
} 