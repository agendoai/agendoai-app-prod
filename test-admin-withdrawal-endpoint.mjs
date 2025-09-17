import fetch from 'node-fetch';

async function testAdminWithdrawal() {
  console.log('🧪 Testando endpoint de withdrawals admin...\n');
  
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Primeiro fazer login para obter token
    console.log('1️⃣ Fazendo login como admin...');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'adminagendoai@gmail.com',
        password: '123456'
      })
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log(`   ❌ Erro no login: ${errorText}`);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log(`   ✅ Login bem-sucedido!`);
    console.log(`   👤 Usuário: ${loginData.user.email} (${loginData.user.userType})`);
    
    const token = loginData.token;
    console.log(`   🔑 Token: ${token.substring(0, 50)}...`);
    
    // Agora testar o endpoint de withdrawals
    console.log('\n2️⃣ Testando endpoint /api/admin/withdrawals...');
    const withdrawalsResponse = await fetch(`${baseUrl}/api/admin/withdrawals?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   Status: ${withdrawalsResponse.status}`);
    
    if (withdrawalsResponse.ok) {
      const withdrawalsData = await withdrawalsResponse.json();
      console.log(`   ✅ Sucesso! Dados recebidos:`);
      console.log(`   📊 Total: ${withdrawalsData.total}`);
      console.log(`   📄 Página: ${withdrawalsData.page}`);
      console.log(`   📋 Withdrawals: ${withdrawalsData.withdrawals.length} itens`);
    } else {
      const errorText = await withdrawalsResponse.text();
      console.log(`   ❌ Erro: ${errorText}`);
      
      // Vamos também testar sem o Bearer prefix
      console.log('\n3️⃣ Testando sem Bearer prefix...');
      const testResponse2 = await fetch(`${baseUrl}/api/admin/withdrawals?page=1&limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });
      console.log(`   Status sem Bearer: ${testResponse2.status}`);
      if (!testResponse2.ok) {
        const errorText2 = await testResponse2.text();
        console.log(`   ❌ Erro sem Bearer: ${errorText2}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Erro na requisição: ${error.message}`);
  }
}

testAdminWithdrawal();
