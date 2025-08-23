import jwt from 'jsonwebtoken';

// Simular o mesmo secret usado no servidor
const JWT_SECRET = 'agendoai-jwt-secret';

// Criar um token de teste
const testPayload = {
  id: 1,
  email: 'cliente@teste.com',
  userType: 'client',
  name: 'Cliente Teste'
};

const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '7d' });

console.log('🔑 Token de teste gerado:');
console.log(token);

// Simular o middleware JWT
function simulateJWTMiddleware(authHeader) {
  console.log('\n🔍 Simulando middleware JWT...');
  console.log('🔍 Auth header:', authHeader);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('🔍 Token extraído:', token.substring(0, 20) + '...');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token verificado com sucesso!');
      console.log('👤 Usuário:', decoded);
      return { success: true, user: decoded };
    } catch (err) {
      console.log('❌ Erro ao verificar token:', err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log('❌ Header Authorization não encontrado ou formato inválido');
    return { success: false, error: 'No authorization header' };
  }
}

// Testar com token válido
console.log('\n🧪 Teste 1: Token válido');
const result1 = simulateJWTMiddleware(`Bearer ${token}`);
console.log('Resultado:', result1);

// Testar sem token
console.log('\n🧪 Teste 2: Sem token');
const result2 = simulateJWTMiddleware();
console.log('Resultado:', result2);

// Testar com token inválido
console.log('\n🧪 Teste 3: Token inválido');
const result3 = simulateJWTMiddleware('Bearer invalid.token.here');
console.log('Resultado:', result3);

console.log('\n🌐 Para testar no navegador:');
console.log(`fetch('http://localhost:3000/api/provider-services/provider/2', {
  headers: {
    'Authorization': 'Bearer ${token}'
  }
}).then(r => r.json()).then(console.log).catch(console.error)`);
