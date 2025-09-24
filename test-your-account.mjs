// Teste direto da sua conta
const API_URL = 'http://localhost:3000';

async function testYourAccount() {
  console.log('🔍 Testando sua conta específica...\n');
  
  // INSTRUÇÕES: Substitua os valores abaixo pelos seus dados reais
  const yourCredentials = {
    email: 'prestador@agendoai.com',  // ← Substitua pelo seu email
    password: 'prestador123'  // ← Substitua pela sua senha
  };
  
  // Verificar se você preencheu os dados
  if (yourCredentials.email === 'SEU_EMAIL_AQUI' || yourCredentials.password === 'SUA_SENHA_AQUI') {
    console.log('❌ VOCÊ PRECISA EDITAR ESTE ARQUIVO!');
    console.log('📝 Abra o arquivo test-your-account.mjs');
    console.log('🔧 Substitua "SEU_EMAIL_AQUI" pelo seu email real');
    console.log('🔧 Substitua "SUA_SENHA_AQUI" pela sua senha real');
    console.log('💾 Salve o arquivo e execute novamente');
    console.log('');
    console.log('📋 Exemplo:');
    console.log('   email: "joao@exemplo.com",');
    console.log('   password: "minhasenha123"');
    return;
  }
  
  try {
    console.log('🔐 Testando login com suas credenciais...');
    console.log(`📧 Email: ${yourCredentials.email}`);
    console.log('🔑 Senha: [OCULTA]');
    console.log('');
    
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(yourCredentials)
    });
    
    console.log(`📥 Status da resposta: ${response.status}`);
    
    if (response.ok) {
      // Login bem-sucedido
      const data = await response.json();
      console.log('✅ LOGIN BEM-SUCEDIDO!');
      console.log(`👤 Nome: ${data.user.name}`);
      console.log(`📧 Email: ${data.user.email}`);
      console.log(`🏷️  Tipo: ${data.user.userType}`);
      console.log(`✅ Ativo: ${data.user.isActive ? 'SIM' : 'NÃO'}`);
      console.log(`🔑 Token recebido: ${data.token ? 'SIM' : 'NÃO'}`);
      
      if (data.user.isActive) {
        console.log('');
        console.log('🎯 PROBLEMA IDENTIFICADO:');
        console.log('   Sua conta ESTÁ ATIVA no banco de dados!');
        console.log('   Por isso você consegue fazer login.');
        console.log('');
        console.log('🔧 SOLUÇÕES:');
        console.log('   1. Desativar sua conta no painel admin');
        console.log('   2. Ou alterar diretamente no banco de dados');
        console.log('   3. Ou usar uma conta que já está desativada para teste');
      } else {
        console.log('');
        console.log('❓ SITUAÇÃO ESTRANHA:');
        console.log('   Sua conta está marcada como INATIVA mas o login funcionou');
        console.log('   Isso indica um bug no código de validação!');
      }
      
    } else if (response.status === 403) {
      // Conta desativada
      const errorText = await response.text();
      console.log('🎯 VALIDAÇÃO FUNCIONANDO!');
      console.log('❌ Sua conta está desativada');
      console.log(`📝 Mensagem: ${errorText}`);
      console.log('');
      console.log('✅ O sistema está funcionando corretamente!');
      console.log('   Se você ainda consegue fazer login no frontend,');
      console.log('   o problema pode estar em:');
      console.log('   1. Cache do navegador');
      console.log('   2. Sessão ativa');
      console.log('   3. Token salvo no localStorage');
      
    } else if (response.status === 401) {
      // Credenciais incorretas
      const errorText = await response.text();
      console.log('❌ CREDENCIAIS INCORRETAS');
      console.log(`📝 Mensagem: ${errorText}`);
      console.log('');
      console.log('🔧 Verifique:');
      console.log('   1. Se o email está correto');
      console.log('   2. Se a senha está correta');
      console.log('   3. Se a conta existe no sistema');
      
    } else {
      // Outro erro
      const errorText = await response.text();
      console.log(`❌ ERRO INESPERADO (${response.status})`);
      console.log(`📝 Mensagem: ${errorText}`);
    }
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
    console.log('');
    console.log('🔧 Possíveis causas:');
    console.log('   1. Servidor não está rodando');
    console.log('   2. Problema de conexão');
    console.log('   3. URL incorreta');
  }
}

// Executar teste
testYourAccount();