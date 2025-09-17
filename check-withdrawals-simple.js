import fetch from 'node-fetch';

async function checkWithdrawals() {
  try {
    console.log('🔍 Verificando saques via API...\n');
    
    // Fazer login primeiro
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'adminagendoai@gmail.com',
        password: '123456'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Erro no login');
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    // Buscar withdrawals
    const withdrawalsResponse = await fetch('http://localhost:5000/api/admin/withdrawals?limit=100', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!withdrawalsResponse.ok) {
      console.log('❌ Erro ao buscar withdrawals:', withdrawalsResponse.status);
      return;
    }
    
    const withdrawalsData = await withdrawalsResponse.json();
    
    console.log(`📊 Total de saques: ${withdrawalsData.total}`);
    console.log(`📋 Saques na página: ${withdrawalsData.withdrawals.length}\n`);
    
    if (withdrawalsData.withdrawals.length > 0) {
      console.log('💰 Saques encontrados:');
      withdrawalsData.withdrawals.forEach((withdrawal, index) => {
        console.log(`${index + 1}. ID: ${withdrawal.id}`);
        console.log(`   Provider ID: ${withdrawal.providerId}`);
        console.log(`   Valor: R$ ${withdrawal.amount}`);
        console.log(`   Status: ${withdrawal.status}`);
        console.log(`   Solicitado em: ${withdrawal.requestedAt}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ Nenhum saque encontrado');
      console.log('\n💡 Os prestadores precisam solicitar saques primeiro');
      console.log('   Verifique se há uma funcionalidade de "Solicitar Saque" no painel do prestador');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkWithdrawals();
