#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Conteúdo do arquivo .env para desenvolvimento
const envContent = `# Database Configuration
DATABASE_URL=postgres://postgres:postgres@localhost:5432/agendoai

# Node Environment
NODE_ENV=development

# Server Configuration
PORT=5000

# JWT Secret (generate a secure random string)
JWT_SECRET=agendoai-jwt-secret-key-2024

# Session Secret
SESSION_SECRET=agendoai-session-secret-key-2024

# Frontend URL
FRONTEND_URL=http://localhost:4020

# API URL
VITE_API_URL=http://localhost:5000

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Redis Configuration (optional, for caching)
REDIS_URL=redis://localhost:6379

# Stripe Configuration (opcional - configure quando necessário)
# STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
# VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key_here

# Email Configuration (opcional - configure quando necessário)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_email_password

# WhatsApp Configuration (opcional - configure quando necessário)
# WHATSAPP_API_KEY=your_whatsapp_api_key
# WHATSAPP_PHONE_NUMBER=your_whatsapp_phone_number

# Push Notifications (opcional - configure quando necessário)
# VAPID_PUBLIC_KEY=your_vapid_public_key
# VAPID_PRIVATE_KEY=your_vapid_private_key

# Anthropic API (opcional - configure quando necessário)
# ANTHROPIC_API_KEY=your_anthropic_api_key

# SumUp Payment (opcional - configure quando necessário)
# SUMUP_API_KEY=your_sumup_api_key
# PLATFORM_MERCHANT_CODE=your_platform_merchant_code
`;

const envPath = path.join(__dirname, '.env');

try {
  // Verificar se o arquivo .env já existe
  if (fs.existsSync(envPath)) {
    console.log('⚠️  Arquivo .env já existe!');
    console.log('Se você quiser sobrescrever, delete o arquivo atual e execute este script novamente.');
  } else {
    // Criar o arquivo .env
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Arquivo .env criado com sucesso!');
    console.log('📁 Localização:', envPath);
    console.log('');
    console.log('🔧 Configurações incluídas:');
    console.log('   - Database URL (PostgreSQL)');
    console.log('   - Porta do servidor (5000)');
    console.log('   - JWT e Session secrets');
    console.log('   - URLs do frontend e API');
    console.log('   - Configurações de upload');
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - Configure sua DATABASE_URL se necessário');
    console.log('   - Descomente e configure as APIs opcionais quando necessário');
    console.log('   - Nunca commite este arquivo no git (já está no .gitignore)');
    console.log('');
    console.log('🚀 Para iniciar o backend, execute:');
    console.log('   npm run dev');
    console.log('   ou');
    console.log('   node server/index.ts');
  }

} catch (error) {
  console.error('❌ Erro ao criar arquivo .env:', error.message);
} 