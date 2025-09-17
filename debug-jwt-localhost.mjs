import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from './server/jwt-config.js';

console.log('🔍 Debug JWT Token - Cole seu token aqui para decodificar\n');

// Substitua este token pelo token que você está usando
const YOUR_TOKEN = 'COLE_SEU_TOKEN_AQUI';

if (YOUR_TOKEN === 'COLE_SEU_TOKEN_AQUI') {
  console.log('❌ Por favor, substitua YOUR_TOKEN pelo token JWT que você está usando');
  console.log('💡 Você pode obter o token:');
  console.log('   1. No DevTools do navegador -> Application -> Local Storage');
  console.log('   2. Ou no Network tab quando faz login');
  console.log('   3. Ou no console do navegador: localStorage.getItem("token")');
} else {
  try {
    console.log('🔑 Token fornecido:', YOUR_TOKEN.substring(0, 50) + '...');
    console.log('🔍 Tamanho do token:', YOUR_TOKEN.length);
    
    // Decodificar sem verificar (para ver o conteúdo)
    const decoded = jwt.decode(YOUR_TOKEN);
    console.log('\n📋 Conteúdo do token (sem verificação):');
    console.log(JSON.stringify(decoded, null, 2));
    
    // Verificar com a chave secreta
    console.log('\n🔐 Verificando token com chave secreta...');
    const verified = jwt.verify(YOUR_TOKEN, JWT_CONFIG.secret);
    console.log('✅ Token válido!');
    console.log('👤 Dados do usuário:');
    console.log(`   ID: ${verified.id}`);
    console.log(`   Email: ${verified.email}`);
    console.log(`   UserType: ${verified.userType}`);
    console.log(`   Nome: ${verified.name}`);
    console.log(`   Expiração: ${new Date(verified.exp * 1000)}`);
    
    // Verificar se é admin
    if (verified.userType === 'admin') {
      console.log('\n✅ USUÁRIO É ADMIN - Token deveria funcionar!');
    } else {
      console.log(`\n❌ USUÁRIO NÃO É ADMIN - UserType: ${verified.userType}`);
    }
    
  } catch (error) {
    console.log('\n❌ Erro ao decodificar/verificar token:');
    console.log(`   Tipo: ${error.name}`);
    console.log(`   Mensagem: ${error.message}`);
    
    if (error.name === 'TokenExpiredError') {
      console.log(`   Expirou em: ${error.expiredAt}`);
      console.log('💡 Faça login novamente para obter um novo token');
    }
    
    if (error.name === 'JsonWebTokenError') {
      console.log('💡 Verifique se o token está completo e correto');
    }
  }
}

console.log('\n🧪 Para testar com seu token:');
console.log('1. Faça login no frontend');
console.log('2. Abra DevTools -> Console');
console.log('3. Digite: localStorage.getItem("token")');
console.log('4. Copie o token e substitua YOUR_TOKEN neste arquivo');
console.log('5. Execute: node debug-jwt-localhost.mjs');
