// Script para criar um usuário desativado para testar a validação
const API_URL = 'http://localhost:3000';

async function createDeactivatedUser() {
  console.log('🧪 Criando usuário desativado para teste...\n');
  
  try {
    // Primeiro, vamos registrar um usuário normal
    const testUser = {
      email: 'teste-desativado@agendoai.com',
      password: '123456',
      name: 'Usuário Teste Desativado',
      userType: 'client',
      cpf: '11144477735', // CPF válido para teste
      phone: '+5511999999999'
    };
    
    console.log('📝 Registrando usuário de teste...');
    console.log(`📧 Email: ${testUser.email}`);
    
    const registerResponse = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });
    
    console.log(`📥 Status do registro: ${registerResponse.status}`);
    
    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ Usuário registrado com sucesso!');
      console.log(`👤 ID: ${registerData.user.id}`);
      console.log(`📧 Email: ${registerData.user.email}`);
      console.log(`✅ Ativo: ${registerData.user.isActive}`);
      
      // Agora vamos tentar fazer login para confirmar que funciona
      console.log('\n🔐 Testando login inicial...');
      
      const loginResponse = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });
      
      console.log(`📥 Status do login: ${loginResponse.status}`);
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ Login funcionou! Usuário está ativo.');
        
        // Agora precisamos desativar o usuário
        console.log('\n🚫 Tentando desativar o usuário...');
        console.log('ℹ️  Para desativar, você precisa:');
        console.log('   1. Fazer login como admin');
        console.log('   2. Usar o endpoint PUT /api/users/:id/deactivate');
        console.log('   3. Ou alterar diretamente no banco de dados');
        console.log(`   4. ID do usuário criado: ${registerData.user.id}`);
        
        // Vamos tentar desativar usando o endpoint (se tivermos permissão)
        console.log('\n🔑 Fazendo login como admin para desativar...');
        
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
        
        if (adminLoginResponse.ok) {
          const adminData = await adminLoginResponse.json();
          console.log('✅ Login admin bem-sucedido!');
          
          // Tentar desativar o usuário
          const deactivateResponse = await fetch(`${API_URL}/api/users/${registerData.user.id}/deactivate`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminData.token}`
            }
          });
          
          console.log(`📥 Status da desativação: ${deactivateResponse.status}`);
          
          if (deactivateResponse.ok) {
            console.log('✅ Usuário desativado com sucesso!');
            
            // Agora vamos testar o login novamente
            console.log('\n🧪 Testando login com conta desativada...');
            
            const testLoginResponse = await fetch(`${API_URL}/api/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
              })
            });
            
            console.log(`📥 Status do teste: ${testLoginResponse.status}`);
            
            if (testLoginResponse.status === 403) {
              const errorData = await testLoginResponse.text();
              console.log('🎯 VALIDAÇÃO FUNCIONANDO! Conta desativada bloqueada.');
              console.log(`📝 Mensagem: ${errorData}`);
            } else if (testLoginResponse.ok) {
              console.log('❌ PROBLEMA! Login ainda funciona com conta desativada!');
              const loginData = await testLoginResponse.json();
              console.log(`✅ isActive: ${loginData.user.isActive}`);
            } else {
              const errorText = await testLoginResponse.text();
              console.log(`❓ Resposta inesperada: ${errorText}`);
            }
            
          } else {
            const deactivateError = await deactivateResponse.text();
            console.log(`❌ Erro ao desativar: ${deactivateError}`);
          }
          
        } else {
          console.log('❌ Erro no login admin');
        }
        
      } else {
        const loginError = await loginResponse.text();
        console.log(`❌ Erro no login inicial: ${loginError}`);
      }
      
    } else {
      const registerError = await registerResponse.text();
      console.log(`❌ Erro no registro: ${registerError}`);
      
      if (registerResponse.status === 400 && registerError.includes('já está cadastrado')) {
        console.log('\n🔄 Usuário já existe, tentando fazer login direto...');
        
        const existingLoginResponse = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password
          })
        });
        
        console.log(`📥 Status do login existente: ${existingLoginResponse.status}`);
        
        if (existingLoginResponse.status === 403) {
          console.log('🎯 VALIDAÇÃO FUNCIONANDO! Usuário já está desativado.');
        } else if (existingLoginResponse.ok) {
          console.log('✅ Login funcionou - usuário está ativo.');
        } else {
          const errorText = await existingLoginResponse.text();
          console.log(`❓ Resposta: ${errorText}`);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar teste
createDeactivatedUser();