// Script para desativar a conta prestador@agendoai.com
const API_URL = 'http://localhost:3000';

async function deactivateAccount() {
  console.log('🔧 Desativando conta prestador@agendoai.com...\n');
  
  try {
    // 1. Fazer login como admin
    console.log('🔑 Fazendo login como admin...');
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
      const errorText = await adminLoginResponse.text();
      console.log(`   Erro: ${errorText}`);
      return;
    }
    
    const adminData = await adminLoginResponse.json();
    console.log('✅ Login admin bem-sucedido!');
    console.log(`👤 Admin: ${adminData.user.name}`);
    
    // 2. Buscar o ID do usuário prestador@agendoai.com
    console.log('\n🔍 Buscando dados do prestador...');
    const usersResponse = await fetch(`${API_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminData.token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!usersResponse.ok) {
      console.log('❌ Erro ao buscar usuários');
      const errorText = await usersResponse.text();
      console.log(`   Erro: ${errorText}`);
      return;
    }
    
    const usersData = await usersResponse.json();
    const prestadorUser = usersData.find(user => user.email === 'prestador@agendoai.com');
    
    if (!prestadorUser) {
      console.log('❌ Usuário prestador@agendoai.com não encontrado');
      console.log('📋 Usuários disponíveis:');
      usersData.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id}, Ativo: ${user.isActive})`);
      });
      return;
    }
    
    console.log('✅ Prestador encontrado!');
    console.log(`   ID: ${prestadorUser.id}`);
    console.log(`   Nome: ${prestadorUser.name}`);
    console.log(`   Email: ${prestadorUser.email}`);
    console.log(`   Ativo: ${prestadorUser.isActive}`);
    
    if (!prestadorUser.isActive) {
      console.log('ℹ️  Conta já está desativada!');
      return;
    }
    
    // 3. Desativar a conta
    console.log('\n🚫 Desativando a conta...');
    const deactivateResponse = await fetch(`${API_URL}/api/users/${prestadorUser.id}/deactivate`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminData.token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!deactivateResponse.ok) {
      console.log('❌ Erro ao desativar conta');
      const errorText = await deactivateResponse.text();
      console.log(`   Erro: ${errorText}`);
      return;
    }
    
    const deactivateData = await deactivateResponse.json();
    console.log('✅ Conta desativada com sucesso!');
    console.log(`   Mensagem: ${deactivateData.message}`);
    console.log(`   Usuário: ${deactivateData.user.name}`);
    console.log(`   Ativo: ${deactivateData.user.isActive}`);
    
    // 4. Testar login com a conta desativada
    console.log('\n🧪 Testando login com conta desativada...');
    const testLoginResponse = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'prestador@agendoai.com',
        password: 'prestador123'
      })
    });
    
    console.log(`📥 Status do teste: ${testLoginResponse.status}`);
    
    if (testLoginResponse.status === 403) {
      const errorText = await testLoginResponse.text();
      console.log('🎯 VALIDAÇÃO FUNCIONANDO!');
      console.log(`   Mensagem: ${errorText}`);
      console.log('✅ O sistema está bloqueando contas desativadas corretamente!');
    } else if (testLoginResponse.ok) {
      console.log('❌ PROBLEMA: Login ainda funcionou!');
      const loginData = await testLoginResponse.json();
      console.log(`   isActive: ${loginData.user.isActive}`);
      console.log('🔍 Isso indica um bug no sistema de validação');
    } else {
      const errorText = await testLoginResponse.text();
      console.log(`❓ Resposta inesperada: ${errorText}`);
    }
    
  } catch (error) {
    console.error('💥 Erro no processo:', error.message);
  }
}

// Executar desativação
deactivateAccount();