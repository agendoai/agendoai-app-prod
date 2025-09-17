import { storage } from './server/storage.js';

async function checkWithdrawals() {
  try {
    console.log('🔍 Verificando saques usando storage.getAllWithdrawals()...\n');
    
    // Usar o método do storage que já funciona
    const result = await storage.getAllWithdrawals({ limit: 100 });
    
    console.log(`📊 Total de saques encontrados: ${result.total}\n`);
    
    if (result.withdrawals.length > 0) {
      console.log('💰 Saques encontrados:');
      result.withdrawals.forEach((withdrawal, index) => {
        console.log(`${index + 1}. ID: ${withdrawal.id}`);
        console.log(`   Provider ID: ${withdrawal.providerId}`);
        console.log(`   Provider: ${withdrawal.providerInfo?.name || 'N/A'} (${withdrawal.providerInfo?.email || 'N/A'})`);
        console.log(`   Valor: R$ ${withdrawal.amount}`);
        console.log(`   Status: ${withdrawal.status}`);
        console.log(`   Solicitado em: ${withdrawal.requestedAt}`);
        console.log(`   Método: ${withdrawal.paymentMethod}`);
        console.log(`   PIX: ${withdrawal.pixInfo?.pixKey || 'N/A'}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ Nenhum saque encontrado');
      console.log('\n💡 Possíveis causas:');
      console.log('   1. Os prestadores ainda não solicitaram saques');
      console.log('   2. Os saques estão sendo salvos em outra tabela');
      console.log('   3. Há um problema na criação de saques');
      
      console.log('\n🔍 Vamos verificar se há prestadores no sistema...');
      const users = await storage.getAllUsers();
      const providers = users.filter(u => u.userType === 'provider');
      console.log(`👥 Prestadores encontrados: ${providers.length}`);
      
      if (providers.length > 0) {
        console.log('📋 Prestadores:');
        providers.slice(0, 5).forEach((provider, index) => {
          console.log(`   ${index + 1}. ${provider.name} (${provider.email})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar saques:', error);
  }
}

checkWithdrawals();
