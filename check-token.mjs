// Script para verificar se o token está sendo salvo corretamente
console.log('🔍 Verificando token no localStorage...');

// Simular verificação do localStorage
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJjbGllbnRlQHRlc3RlLmNvbSIsInVzZXJUeXBlIjoiY2xpZW50IiwibmFtZSI6IkNsaWVudGUgVGVzdGUiLCJpYXQiOjE3NDc4NzY4MDAsImV4cCI6MTc0ODQ4MTYwMH0.example';

console.log('🔑 Token de exemplo:', token);
console.log('📏 Comprimento do token:', token.length);

// Verificar se o token tem o formato correto (3 partes separadas por ponto)
const parts = token.split('.');
console.log('🔍 Partes do token:', parts.length);

if (parts.length === 3) {
  console.log('✅ Token tem formato JWT válido');
  
  // Tentar decodificar o header e payload (sem verificar assinatura)
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('📋 Header:', header);
    console.log('📋 Payload:', payload);
    
    // Verificar se o payload tem os campos necessários
    if (payload.id && payload.userType) {
      console.log('✅ Payload contém campos necessários');
      console.log(`👤 ID do usuário: ${payload.id}`);
      console.log(`👤 Tipo de usuário: ${payload.userType}`);
    } else {
      console.log('❌ Payload não contém campos necessários');
    }
  } catch (error) {
    console.log('❌ Erro ao decodificar token:', error.message);
  }
} else {
  console.log('❌ Token não tem formato JWT válido');
}

console.log('\n🌐 Para testar no navegador:');
console.log('1. Abra o DevTools (F12)');
console.log('2. Vá para a aba Console');
console.log('3. Digite: localStorage.getItem("authToken")');
console.log('4. Verifique se retorna um token válido');

console.log('\n🔍 Para testar a API:');
console.log(`fetch('http://localhost:3000/api/provider-services/provider/2', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
  }
}).then(r => r.json()).then(console.log)`);
