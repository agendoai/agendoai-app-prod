import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './shared/schema.js';

// Configuração do banco de dados
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/agendoai1';
const client = postgres(connectionString);
const db = drizzle(client);

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuários no banco de dados...\n');
    
    const allUsers = await db.select().from(users);
    
    console.log(`📊 Total de usuários encontrados: ${allUsers.length}\n`);
    
    allUsers.forEach((user, index) => {
      console.log(`👤 Usuário ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nome: ${user.name || 'N/A'}`);
      console.log(`   Tipo: ${user.userType}`);
      console.log(`   Ativo: ${user.isActive}`);
      console.log(`   Verificado: ${user.isVerified}`);
      console.log(`   Criado em: ${user.createdAt}`);
      console.log('   ---');
    });
    
    // Verificar tipos de usuário
    const userTypes = {};
    allUsers.forEach(user => {
      userTypes[user.userType] = (userTypes[user.userType] || 0) + 1;
    });
    
    console.log('\n📈 Distribuição por tipo de usuário:');
    Object.entries(userTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} usuário(s)`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
  } finally {
    await client.end();
  }
}

checkUsers(); 