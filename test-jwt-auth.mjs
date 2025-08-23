import jwt from 'jsonwebtoken';

// Simular o mesmo secret usado no servidor
const JWT_SECRET = 'agendoai-jwt-secret';

// Criar um token de teste
const testPayload = {
  id: 1,
  email: 'test@example.com',
  userType: 'client',
  name: 'Test User'
};

const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '7d' });

console.log('🔑 Token de teste gerado:');
console.log(token);
console.log('\n📋 Payload decodificado:');
console.log(jwt.decode(token));

// Testar verificação do token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('\n✅ Token verificado com sucesso:');
  console.log(decoded);
} catch (error) {
  console.log('\n❌ Erro ao verificar token:', error.message);
}

console.log('\n🌐 Para testar no navegador:');
console.log(`fetch('http://localhost:3000/api/client/recent-services-providers', {
  headers: {
    'Authorization': 'Bearer ${token}'
  }
})`);
