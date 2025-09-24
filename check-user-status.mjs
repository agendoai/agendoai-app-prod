// Script para verificar o status isActive dos usuários no banco
import { storage } from './server/storage.ts';

async function checkUserStatus() {
  console.log('🔍 Verificando status dos usuários no banco...\n');
  
  try {
    // Vamos listar todos os usuários e seus status
    const users = await storage.getAllUsers();
    
    if (!users || users.length === 0) {
      console.log('❌ Nenhum usuário encontrado no banco');
      return;
    }
    
    console.log(`📊 Total de usuários encontrados: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`👤 Usuário ${index + 1}:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Nome: ${user.name}`);
      console.log(`   🏷️  Tipo: ${user.userType}`);
      console.log(`   ✅ Ativo: ${user.isActive ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   📅 Criado em: ${user.createdAt}`);
      console.log('');
    });
    
    // Contar usuários ativos e inativos
    const activeUsers = users.filter(u => u.isActive);
    const inactiveUsers = users.filter(u => !u.isActive);
    
    console.log('📈 Resumo:');
    console.log(`   ✅ Usuários ativos: ${activeUsers.length}`);
    console.log(`   ❌ Usuários inativos: ${inactiveUsers.length}`);
    
    if (inactiveUsers.length > 0) {
      console.log('\n🚨 Usuários com conta desativada:');
      inactiveUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.name})`);
      });
    }
    
  } catch (error) {
    console.error('💥 Erro ao verificar usuários:', error);
    
    // Se der erro, vamos tentar uma abordagem mais simples
    console.log('\n🔄 Tentando abordagem alternativa...');
    
    try {
      // Vamos tentar buscar um usuário específico se você souber o email
      console.log('ℹ️  Para verificar um usuário específico, você pode modificar este script');
      console.log('   e usar: await storage.getUserByEmail("seu-email@exemplo.com")');
      
    } catch (altError) {
      console.error('💥 Erro na abordagem alternativa:', altError);
    }
  }
}

// Executar verificação
checkUserStatus();