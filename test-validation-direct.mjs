// Teste direto da validação de conta desativada
const API_URL = 'http://localhost:3000';

async function testValidationDirect() {
  console.log('🔍 Testando validação de conta desativada diretamente...\n');
  
  try {
    // Vamos adicionar um log no servidor para ver se a validação está sendo executada
    console.log('📝 Primeiro, vamos verificar se o servidor está respondendo...');
    
    const healthCheck = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'teste-inexistente@teste.com',
        password: '123456'
      })
    });
    
    console.log(`📥 Status do health check: ${healthCheck.status}`);
    
    if (healthCheck.status === 401) {
      console.log('✅ Servidor está respondendo normalmente');
    }
    
    // Agora vamos testar com diferentes cenários
    console.log('\n🧪 Testando diferentes cenários...\n');
    
    // Cenário 1: Usuário que não existe
    console.log('1️⃣ Testando usuário inexistente:');
    const test1 = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nao-existe@teste.com',
        password: '123456'
      })
    });
    
    console.log(`   Status: ${test1.status}`);
    const response1 = await test1.text();
    console.log(`   Resposta: ${response1}\n`);
    
    // Cenário 2: Admin (deve funcionar)
    console.log('2️⃣ Testando admin (deve funcionar):');
    const test2 = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@agendoai.com.br',
        password: '123456'
      })
    });
    
    console.log(`   Status: ${test2.status}`);
    if (test2.ok) {
      const response2 = await test2.json();
      console.log(`   Nome: ${response2.user.name}`);
      console.log(`   isActive: ${response2.user.isActive}`);
    } else {
      const errorText = await test2.text();
      console.log(`   Erro: ${errorText}`);
    }
    console.log('');
    
    // Cenário 3: Vamos tentar criar e desativar um usuário para teste
    console.log('3️⃣ Vamos tentar com o usuário de teste que criamos:');
    const test3 = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'teste-desativado@agendoai.com',
        password: '123456'
      })
    });
    
    console.log(`   Status: ${test3.status}`);
    const response3 = await test3.text();
    console.log(`   Resposta: ${response3}\n`);
    
    // Agora vamos mostrar instruções para você testar com sua conta
    console.log('4️⃣ Para testar com SUA conta:');
    console.log('   📧 Substitua "SEU_EMAIL" pelo seu email real');
    console.log('   🔑 Substitua "SUA_SENHA" pela sua senha real');
    console.log('   🧪 Execute o teste abaixo:\n');
    
    console.log('   const testSuaConta = await fetch(`${API_URL}/api/login`, {');
    console.log('     method: "POST",');
    console.log('     headers: { "Content-Type": "application/json" },');
    console.log('     body: JSON.stringify({');
    console.log('       email: "SEU_EMAIL",');
    console.log('       password: "SUA_SENHA"');
    console.log('     })');
    console.log('   });');
    console.log('   console.log("Status:", testSuaConta.status);');
    console.log('   console.log("Resposta:", await testSuaConta.text());\n');
    
    console.log('🔍 Se você quiser, pode me dar seu email e senha que eu testo diretamente!');
    console.log('   (Ou modifique este script adicionando suas credenciais)');
    
  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
}

// Executar teste
testValidationDirect();