import { storage } from './server/storage.js';

async function checkAdminUser() {
  try {
    console.log('🔍 Verificando usuários admin no banco de dados...\n');
    
    // Buscar todos os usuários para ver quais existem
    const users = await storage.getAllUsers();
    console.log('📊 Total de usuários encontrados:', users.length);
    
    // Filtrar usuários admin
    const adminUsers = users.filter(user => user.userType === 'admin');
    console.log('👑 Usuários admin encontrados:', adminUsers.length);
    
    if (adminUsers.length > 0) {
      console.log('\n✅ Usuários admin:');
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, UserType: ${user.userType}, Nome: ${user.name}`);
      });
    } else {
      console.log('\n❌ Nenhum usuário admin encontrado!');
      console.log('\n📋 Todos os usuários no sistema:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, UserType: ${user.userType}, Nome: ${user.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
  }
}

checkAdminUser();
