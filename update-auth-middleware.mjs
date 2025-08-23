import fs from 'fs';
import path from 'path';

// Lista de arquivos de rotas para atualizar
const routeFiles = [
  'server/routes/alternative-suggestions-routes.ts',
  'server/routes/booking-slots-routes-minimal.ts',
  'server/routes/booking-slots-routes.ts',
  'server/routes/marketplace-routes.ts',
  'server/routes/payment-preferences-routes.ts',
  'server/routes/provider-ai-routes.ts',
  'server/routes/provider-breaks-routes.ts',
  'server/routes/providers-routes.ts',
  'server/routes/sumup-payment-routes.ts',
  'server/routes/service-templates-routes.ts',
  'server/routes/user-management-routes.ts',
  'server/routes/admin-reports-routes.ts',
  'server/routes/admin-settings-routes.ts',
  'server/routes/asaas-marketplace-routes.ts',
  'server/routes/push-notification-routes.ts'
];

// Função para atualizar um arquivo
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Adicionar importação do middleware JWT se não existir
    if (!content.includes('from \'../middleware/jwt-auth\'')) {
      const importMatch = content.match(/import.*from.*['"]express['"];?/);
      if (importMatch) {
        const newImport = `import { isAuthenticated, isClient, isProvider, isAdmin, isSupport, isAdminOrSupport } from '../middleware/jwt-auth';`;
        content = content.replace(importMatch[0], importMatch[0] + '\n' + newImport);
        updated = true;
      }
    }

    // Substituir verificações de autenticação
    const authPatterns = [
      { from: /if \(!req\.isAuthenticated\(\)\)/g, to: 'if (!req.user)' },
      { from: /req\.isAuthenticated\(\)/g, to: 'req.user' }
    ];

    authPatterns.forEach(pattern => {
      if (content.includes(pattern.from.source.replace(/\\/g, ''))) {
        content = content.replace(pattern.from, pattern.to);
        updated = true;
      }
    });

    // Remover definições locais de middleware isAuthenticated
    const localAuthPattern = /\/\/ Middleware para verificar se o usuário está autenticado[\s\S]*?return res\.status\(401\)\.json\(\{ error: "Não autorizado" \}\);\s*};/g;
    if (content.match(localAuthPattern)) {
      content = content.replace(localAuthPattern, '');
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Atualizado: ${filePath}`);
    } else {
      console.log(`⏭️  Sem alterações: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${filePath}:`, error.message);
  }
}

// Executar atualizações
console.log('🔄 Atualizando arquivos de rotas com middleware JWT...\n');

routeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    updateFile(file);
  } else {
    console.log(`⚠️  Arquivo não encontrado: ${file}`);
  }
});

console.log('\n✅ Atualização concluída!');
