// Script para reativar conta de usuário prestador
import { storage } from './server/storage.js';

async function reactivateProviderAccount() {
  console.log('🔄 Script de Reativação de Conta de Prestador\n');
  
  try {
    // 1. Listar todos os usuários prestadores inativos
    console.log('🔍 Buscando usuários prestadores inativos...\n');
    
    const allUsers = await storage.getAllUsers();
    const inactiveProviders = allUsers.filter(user => 
      user.userType === 'provider' && !user.isActive
    );
    
    if (inactiveProviders.length === 0) {
      console.log('✅ Não há prestadores com contas desativadas.');
      return;
    }
    
    console.log(`📊 Encontrados ${inactiveProviders.length} prestador(es) com conta desativada:\n`);
    
    inactiveProviders.forEach((provider, index) => {
      console.log(`${index + 1}. 👤 ${provider.name}`);
      console.log(`   📧 Email: ${provider.email}`);
      console.log(`   🆔 ID: ${provider.id}`);
      console.log(`   📅 Criado em: ${provider.createdAt}`);
      console.log(`   ❌ Status: Desativado\n`);
    });
    
    // 2. Solicitar qual prestador reativar (ou reativar todos)
    console.log('🎯 Opções de reativação:');
    console.log('   0 - Reativar TODOS os prestadores listados acima');
    inactiveProviders.forEach((provider, index) => {
      console.log(`   ${index + 1} - Reativar apenas ${provider.name} (${provider.email})`);
    });
    
    // Para este exemplo, vamos criar uma função que pode ser chamada com parâmetros
    // Você pode modificar esta parte para aceitar input do usuário
    
    // CONFIGURAÇÃO: Defina aqui qual ação tomar
    // Opções:
    // - 'all': reativa todos os prestadores inativos
    // - número: reativa o prestador específico (1, 2, 3, etc.)
    // - email: reativa o prestador com o email específico
    const ACTION = 'all'; // Mude para o número ou email específico se necessário
    
    let providersToReactivate = [];
    
    if (ACTION === 'all') {
      providersToReactivate = inactiveProviders;
      console.log('\n🚀 Reativando TODOS os prestadores inativos...\n');
    } else if (typeof ACTION === 'number' && ACTION > 0 && ACTION <= inactiveProviders.length) {
      providersToReactivate = [inactiveProviders[ACTION - 1]];
      console.log(`\n🚀 Reativando prestador: ${providersToReactivate[0].name}...\n`);
    } else if (typeof ACTION === 'string' && ACTION.includes('@')) {
      const providerByEmail = inactiveProviders.find(p => p.email === ACTION);
      if (providerByEmail) {
        providersToReactivate = [providerByEmail];
        console.log(`\n🚀 Reativando prestador: ${providerByEmail.name}...\n`);
      } else {
        console.log(`❌ Prestador com email ${ACTION} não encontrado na lista de inativos.`);
        return;
      }
    } else {
      console.log('❌ Ação inválida. Modifique a variável ACTION no script.');
      return;
    }
    
    // 3. Reativar os prestadores selecionados
    let successCount = 0;
    let errorCount = 0;
    
    for (const provider of providersToReactivate) {
      try {
        console.log(`🔄 Reativando ${provider.name} (ID: ${provider.id})...`);
        
        // Atualizar o campo isActive para true
        const updatedUser = await storage.updateUser(provider.id, { isActive: true });
        
        if (updatedUser && updatedUser.isActive) {
          console.log(`✅ ${provider.name} reativado com sucesso!`);
          console.log(`   📧 Email: ${updatedUser.email}`);
          console.log(`   ✅ Status: ${updatedUser.isActive ? 'Ativo' : 'Inativo'}`);
          successCount++;
        } else {
          console.log(`❌ Erro ao reativar ${provider.name} - Status não foi alterado`);
          errorCount++;
        }
        
      } catch (error) {
        console.log(`❌ Erro ao reativar ${provider.name}:`, error.message);
        errorCount++;
      }
      
      console.log(''); // Linha em branco
    }
    
    // 4. Resumo final
    console.log('📈 Resumo da Operação:');
    console.log(`   ✅ Prestadores reativados com sucesso: ${successCount}`);
    console.log(`   ❌ Erros durante reativação: ${errorCount}`);
    console.log(`   📊 Total processado: ${providersToReactivate.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Reativação concluída! Os prestadores podem agora fazer login normalmente.');
    }
    
  } catch (error) {
    console.error('💥 Erro geral no script de reativação:', error);
  }
}

// Função auxiliar para reativar um prestador específico por email
export async function reactivateProviderByEmail(email) {
  console.log(`🔄 Reativando prestador com email: ${email}\n`);
  
  try {
    // Buscar usuário por email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.log(`❌ Usuário com email ${email} não encontrado.`);
      return false;
    }
    
    if (user.userType !== 'provider') {
      console.log(`❌ Usuário ${email} não é um prestador (tipo: ${user.userType}).`);
      return false;
    }
    
    if (user.isActive) {
      console.log(`ℹ️  Prestador ${user.name} já está ativo.`);
      return true;
    }
    
    // Reativar
    const updatedUser = await storage.updateUser(user.id, { isActive: true });
    
    if (updatedUser && updatedUser.isActive) {
      console.log(`✅ Prestador ${updatedUser.name} reativado com sucesso!`);
      return true;
    } else {
      console.log(`❌ Erro ao reativar prestador ${user.name}`);
      return false;
    }
    
  } catch (error) {
    console.error(`💥 Erro ao reativar prestador ${email}:`, error);
    return false;
  }
}

// Função auxiliar para reativar um prestador específico por ID
export async function reactivateProviderById(id) {
  console.log(`🔄 Reativando prestador com ID: ${id}\n`);
  
  try {
    // Buscar usuário por ID
    const user = await storage.getUser(id);
    
    if (!user) {
      console.log(`❌ Usuário com ID ${id} não encontrado.`);
      return false;
    }
    
    if (user.userType !== 'provider') {
      console.log(`❌ Usuário ${user.email} não é um prestador (tipo: ${user.userType}).`);
      return false;
    }
    
    if (user.isActive) {
      console.log(`ℹ️  Prestador ${user.name} já está ativo.`);
      return true;
    }
    
    // Reativar
    const updatedUser = await storage.updateUser(user.id, { isActive: true });
    
    if (updatedUser && updatedUser.isActive) {
      console.log(`✅ Prestador ${updatedUser.name} reativado com sucesso!`);
      return true;
    } else {
      console.log(`❌ Erro ao reativar prestador ${user.name}`);
      return false;
    }
    
  } catch (error) {
    console.error(`💥 Erro ao reativar prestador ID ${id}:`, error);
    return false;
  }
}

// Executar o script principal se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  reactivateProviderAccount();
}

export default reactivateProviderAccount;