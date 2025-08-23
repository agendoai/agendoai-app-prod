// Teste para verificar se o token está sendo salvo no frontend
console.log('🔍 TESTE: Verificação do token no frontend\n');

console.log('📋 INSTRUÇÕES PARA TESTAR NO NAVEGADOR:');
console.log('');
console.log('1. Abra o console do navegador (F12)');
console.log('2. Vá para https://agendoai-app-prod-6qoh.vercel.app');
console.log('3. Execute os comandos abaixo:');
console.log('');

console.log('// === TESTE 1: Verificar localStorage atual ===');
console.log('console.log("localStorage disponível:", typeof localStorage !== "undefined");');
console.log('console.log("Token atual:", localStorage.getItem("authToken"));');
console.log('console.log("Todas as chaves:", Object.keys(localStorage));');
console.log('');

console.log('// === TESTE 2: Fazer login e verificar se salva ===');
console.log('fetch("https://app.tbsnet.com.br/api/login", {');
console.log('  method: "POST",');
console.log('  headers: { "Content-Type": "application/json" },');
console.log('  body: JSON.stringify({');
console.log('    email: "admin@agendoai.com.br",');
console.log('    password: "123456"');
console.log('  })');
console.log('})');
console.log('.then(r => r.json())');
console.log('.then(data => {');
console.log('  console.log("Resposta do login:", data);');
console.log('  if (data.token) {');
console.log('    localStorage.setItem("authToken", data.token);');
console.log('    console.log("✅ Token salvo manualmente");');
console.log('    console.log("Token salvo:", localStorage.getItem("authToken"));');
console.log('    console.log("Tamanho do token:", data.token.length);');
console.log('  } else {');
console.log('    console.log("❌ Nenhum token na resposta");');
console.log('  }');
console.log('});');
console.log('');

console.log('// === TESTE 3: Testar /api/user com token salvo ===');
console.log('const token = localStorage.getItem("authToken");');
console.log('if (token) {');
console.log('  console.log("🔑 Token encontrado, testando /api/user...");');
console.log('  fetch("https://app.tbsnet.com.br/api/user", {');
console.log('    headers: { "Authorization": `Bearer ${token}` }');
console.log('  })');
console.log('  .then(r => {');
console.log('    console.log("Status:", r.status);');
console.log('    return r.json();');
console.log('  })');
console.log('  .then(data => console.log("Dados do usuário:", data))');
console.log('  .catch(err => console.error("Erro:", err));');
console.log('} else {');
console.log('  console.log("❌ Nenhum token encontrado");');
console.log('}');
console.log('');

console.log('🔍 POSSÍVEIS PROBLEMAS:');
console.log('1. localStorage não está funcionando (modo privado)');
console.log('2. O hook useAuth não está salvando o token');
console.log('3. O token está sendo salvo mas não está sendo enviado');
console.log('4. Problema de CORS no frontend');
console.log('');

console.log('🎯 Execute esses testes e me diga o resultado!');
