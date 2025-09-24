// Script simples para reativar conta de usuário prestador
import { storage } from './server/storage.js';

async function simpleReactivateProvider() {
  console.log('🔄 Script Simples de Reativação de Prestador\n');
  
  try {
    // 1. Buscar todos os usuários
    console.log('🔍 Buscando usuários...');
    const allUsers = await storage.getAllUsers();
    console.log(`📊 Total de usuários encontrados: ${allUsers.length}\n`);
    
    // 2. Filtrar prestadores
    const providers = allUsers.filter(user => user.userType === 'provider');
    console.log(`👥 Total de prestadores: ${providers.length}`);
    
    // 3. Filtrar prestadores inativos
    const inactiveProviders = providers.filter(provider => !provider.isActive);
    console.log(`❌ Prestadores inativos: ${inactiveProviders.length}\n`);
    
    if (inactiveProviders.length === 0) {
      console.log('✅ Não há prestadores com contas desativadas.');
      return;
    }
    
    // 4. Listar prestadores inativos
    console.log('📋 Prestadores com contas desativadas:');
    inactiveProviders.forEach((provider, index) => {
      console.log(`${index + 1}. ${provider.name} (${provider.email}) - ID: ${provider.id}`);
    });
    
    console.log('\n🚀 Reativando TODOS os prestadores inativos...\n');
    
    // 5. Reativar todos os prestadores inativos
    let successCount = 0;
    let errorCount = 0;
    
    for (const provider of inactiveProviders) {
      try {
        console.log(`🔄 Reativando ${provider.name}...`);
        
        const updatedUser = await storage.updateUser(provider.id, { isActive: true });
        
        if (updatedUser && updatedUser.isActive) {
          console.log(`✅ ${provider.name} reativado com sucesso!`);
          successCount++;
        } else {
          console.log(`❌ Erro ao reativar ${provider.name} - Status não foi alterado`);
          errorCount++;
        }
        
      } catch (error) {
        console.log(`❌ Erro ao reativar ${provider.name}:`, error.message);
        errorCount++;
      }
    }
    
    // 6. Resumo
    console.log('\n📈 Resumo da Operação:');
    console.log(`   ✅ Prestadores reativados: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📊 Total processado: ${inactiveProviders.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Reativação concluída! Os prestadores podem agora fazer login normalmente.');
    }
    
  } catch (error) {
    console.error('💥 Erro geral no script:', error);
  }
}

// Executar o script
simpleReactivateProvider();