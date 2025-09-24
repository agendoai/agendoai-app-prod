// Debug da inconsistência: Admin diz que está desativada, mas login funciona
const API_URL = 'http://localhost:3000';

async function debugInconsistency() {
  console.log('🔍 INVESTIGANDO INCONSISTÊNCIA...\n');
  console.log('❓ Situação estranha:');
  console.log('   - Admin API diz: isActive = false');
  console.log('   - Login API permite: login bem-sucedido com isActive = true');
  console.log('');
  
  try {
    // 1. Login como admin para verificar dados
    console.log('1️⃣ Fazendo login como admin...');
    const adminLoginResponse = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@agendoai.com.br',
        password: '123456'
      })
    });
    
    if (!adminLoginResponse.ok) {
      console.log('❌ Erro no login admin');
      return;
    }
    
    const adminData = await adminLoginResponse.json();
    console.log('✅ Admin logado');
    
    // 2. Buscar dados via API admin
    console.log('\n2️⃣ Buscando dados via API admin...');
    const usersResponse = await fetch(`${API_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminData.token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      const prestador = usersData.find(user => user.email === 'prestador@agendoai.com');
      
      if (prestador) {
        console.log('📋 Dados via API admin:');
        console.log(`   ID: ${prestador.id}`);
        console.log(`   Nome: ${prestador.name}`);
        console.log(`   Email: ${prestador.email}`);
        console.log(`   isActive: ${prestador.isActive}`);
        console.log(`   userType: ${prestador.userType}`);
      } else {
        console.log('❌ Prestador não encontrado via API admin');
      }
    } else {
      console.log('❌ Erro ao buscar via API admin');
    }
    
    // 3. Tentar login direto
    console.log('\n3️⃣ Testando login direto...');
    const loginResponse = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'prestador@agendoai.com',
        password: 'prestador123'
      })
    });
    
    console.log(`📥 Status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('📋 Dados via login:');
      console.log(`   ID: ${loginData.user.id}`);
      console.log(`   Nome: ${loginData.user.name}`);
      console.log(`   Email: ${loginData.user.email}`);
      console.log(`   isActive: ${loginData.user.isActive}`);
      console.log(`   userType: ${loginData.user.userType}`);
      
      // 4. Usar o token para buscar dados via /api/user
      console.log('\n4️⃣ Buscando dados via /api/user...');
      const userResponse = await fetch(`${API_URL}/api/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('📋 Dados via /api/user:');
        console.log(`   ID: ${userData.id}`);
        console.log(`   Nome: ${userData.name}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   isActive: ${userData.isActive}`);
        console.log(`   userType: ${userData.userType}`);
      } else {
        console.log('❌ Erro ao buscar via /api/user');
      }
      
    } else {
      const errorText = await loginResponse.text();
      console.log(`❌ Login falhou: ${errorText}`);
    }
    
    // 5. Análise
    console.log('\n🔍 ANÁLISE:');
    console.log('Se os dados são diferentes entre as APIs, pode ser:');
    console.log('   1. Cache no servidor');
    console.log('   2. Diferentes fontes de dados');
    console.log('   3. Problema na query do banco');
    console.log('   4. Middleware de autenticação não verificando isActive');
    console.log('   5. Dados sendo alterados após a validação');
    
  } catch (error) {
    console.error('💥 Erro:', error.message);
  }
}

// Executar debug
debugInconsistency();