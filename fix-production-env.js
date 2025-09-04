#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conteúdo corrigido do arquivo .env para PRODUÇÃO
const productionEnvContent = `# Database Configuration
DATABASE_URL=postgresql://agendoai:agendoaibd123dev@191.252.196.5:5432/agendoaibd

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51RkqXrRr6s3UmWYUd6Y8WMg8WNbRzDHtnECzlMD06b8h5qpkk7hSP6OmykveIqvu1wFI1H2LXUK0JJ68XSGKuxM100Ppd8bGVP

VITE_STRIPE_PUBLIC_KEY=pk_test_51RkqXrRr6s3UmWYUrWgAlgej5ir5MpLUjjpQLkGPeHeg8vy3ZJAbIttYkjR3EzrI9zzvFgI6lPRMZhGj55NnIFYF00F1YurTA7

# Asaas Configuration
ASAAS_API_KEY=$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjQyZTVjOTFiLTVjOTktNDNhMi05NzFjLWY1ODUwMzRhZDZmYzo6JGFhY2hfZTU3NWQzYzMtNDM0My00NWM2LWExMDMtNWViNTFmMmFhOGYy

ASAAS_WALLET_ID=3feca16f-330f-4004-a347-f2e5a0508817
ASAAS_WEBHOOK_TOKEN=token_webhook_opcional
ASAAS_WALLET_ID_SUBCONTA=4cb0f0eb-2419-4086-a28f-e01c1081eb5e
ASAAS_LIVE_MODE=true

# Node Environment - CORRIGIDO PARA PRODUÇÃO
NODE_ENV=production

# Server Configuration - CORRIGIDO PARA PRODUÇÃO
PORT=5000
FRONTEND_URL=https://agendoai-app-prod-6qoh.vercel.app
COOKIE_DOMAIN=.tbsnet.com.br

# JWT Secret
JWT_SECRET=agendoai-jwt-secret-key-2024-production

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password

# WhatsApp Configuration
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_PHONE_NUMBER=your_whatsapp_phone_number

# Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Webhook secret do Stripe
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# URLs de retorno e refresh do onboarding Stripe Connect - CORRIGIDO PARA PRODUÇÃO
STRIPE_ONBOARDING_RETURN_URL=https://agendoai-app-prod-6qoh.vercel.app/onboarding/stripe/return
STRIPE_ONBOARDING_REFRESH_URL=https://agendoai-app-prod-6qoh.vercel.app/onboarding/stripe/refresh
`;

const envPath = path.join(__dirname, '.env');

try {
  // Fazer backup do arquivo atual
  const backupPath = path.join(__dirname, '.env.backup');
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, backupPath);
    console.log('✅ Backup criado: .env.backup');
  }
  
  // Sobrescrever com configurações de PRODUÇÃO
  fs.writeFileSync(envPath, productionEnvContent);
  
  console.log('✅ Arquivo .env corrigido para PRODUÇÃO!');
  console.log('📁 Localização:', envPath);
  console.log('');
  console.log('🔧 Principais correções aplicadas:');
  console.log('   - NODE_ENV=production (era development)');
  console.log('   - FRONTEND_URL=https://agendoai-app-prod-6qoh.vercel.app (era local)');
  console.log('   - COOKIE_DOMAIN=.tbsnet.com.br (era local)');
  console.log('   - STRIPE_ONBOARDING_RETURN_URL=https://... (era localhost)');
  console.log('');
  console.log('🚀 Para aplicar as mudanças:');
  console.log('   1. Reinicie o servidor backend');
  console.log('   2. Teste as chamadas API');
  console.log('');
  console.log('⚠️  IMPORTANTE:');
  console.log('   - Todas as URLs agora apontam para produção');
  console.log('   - Cookies serão configurados para o domínio correto');
  console.log('   - Stripe onboarding funcionará em produção');

} catch (error) {
  console.error('❌ Erro ao corrigir arquivo .env:', error.message);
}
