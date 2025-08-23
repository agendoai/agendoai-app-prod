// Debug do problema do token no frontend
console.log('🔍 DEBUG: Problema do token no frontend\n');

console.log('📋 INSTRUÇÕES PARA TESTAR NO NAVEGADOR:');
console.log('');
console.log('1. Abra o console do navegador (F12)');
console.log('2. Vá para https://agendoai-app-prod-6qoh.vercel.app');
console.log('3. Execute os comandos abaixo:');
console.log('');

console.log('// === TESTE 1: Verificar localStorage ===');
console.log('console.log("localStorage disponível:", typeof localStorage !== "undefined");');
console.log('console.log("Token atual:", localStorage.getItem("authToken"));');
console.log('');

console.log('// === TESTE 2: Fazer login manualmente ===');
console.log('fetch("https://app.tbsnet.com.br/api/login", {');
console.log('  method: "POST",');
console.log('  headers: { "Content-Type": "application/json" },');
console.log('  body: JSON.stringify({');
console.log('    email: "admin@agendoai.com",');
console.log('    password: "admin123"');
console.log('  })');
console.log('})');
console.log('.then(r => r.json())');
console.log('.then(data => {');
console.log('  console.log("Resposta do login:", data);');
console.log('  if (data.token) {');
console.log('    localStorage.setItem("authToken", data.token);');
console.log('    console.log("Token salvo manualmente");');
console.log('    console.log("Token salvo:", localStorage.getItem("authToken"));');
console.log('  }');
console.log('});');
console.log('');

console.log('// === TESTE 3: Testar /api/user com token salvo ===');
console.log('const token = localStorage.getItem("authToken");');
console.log('if (token) {');
console.log('  fetch("https://app.tbsnet.com.br/api/user", {');
console.log('    headers: { "Authorization": `Bearer ${token}` }');
console.log('  })');
console.log('  .then(r => r.json())');
console.log('  .then(data => console.log("Dados do usuário:", data));');
console.log('} else {');
console.log('  console.log("Nenhum token encontrado");');
console.log('}');
console.log('');

console.log('🔍 POSSÍVEIS CAUSAS:');
console.log('1. localStorage não está funcionando (modo privado)');
console.log('2. O hook useAuth não está salvando o token');
console.log('3. O token está sendo salvo mas não está sendo enviado');
console.log('4. Problema de CORS no frontend');
console.log('');

console.log('🎯 Execute esses testes e me diga o resultado!');
