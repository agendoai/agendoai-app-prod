// Script para testar localStorage
console.log('🧪 Testando localStorage...\n');

console.log('📋 Para testar no navegador, abra o console e execute:');
console.log('');
console.log('// 1. Testar se localStorage está disponível');
console.log('console.log("localStorage disponível:", typeof localStorage !== "undefined");');
console.log('');
console.log('// 2. Testar salvar e recuperar um valor');
console.log('localStorage.setItem("teste", "valor-teste");');
console.log('console.log("Valor salvo:", localStorage.getItem("teste"));');
console.log('');
console.log('// 3. Verificar se o token existe');
console.log('console.log("Token atual:", localStorage.getItem("authToken"));');
console.log('');
console.log('// 4. Simular login e salvar token');
console.log('const tokenTeste = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";');
console.log('localStorage.setItem("authToken", tokenTeste);');
console.log('console.log("Token salvo:", localStorage.getItem("authToken"));');
console.log('');
console.log('🔍 Possíveis problemas:');
console.log('1. localStorage não está disponível (modo privado/incognito)');
console.log('2. localStorage está sendo bloqueado pelo navegador');
console.log('3. Erro de CORS impedindo o acesso');
console.log('4. Problema na resposta do servidor');
console.log('');
console.log('🎯 Teste no console do navegador e me diga o resultado!');
