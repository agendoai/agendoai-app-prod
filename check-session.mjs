import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../shared/schema.js';

// Configuração do banco
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agendoai';
const client = postgres(connectionString);
const db = drizzle(client);

async function checkUsers() {
  try {
    console.log('=== VERIFICANDO USUÁRIOS NO BANCO ===');
    
    // Buscar todos os usuários
    const allUsers = await db.select().from(users);
    
    console.log(`Total de usuários: ${allUsers.length}`);
    
    allUsers.forEach(user => {
      console.log(`ID: ${user.id} | Email: ${user.email} | Tipo: ${user.userType} | Nome: ${user.name}`);
    });
    
    // Verificar especificamente o usuário rauanconceicao789@gmail.com
    const rauanUser = allUsers.find(u => u.email === 'rauanconceicao789@gmail.com');
    if (rauanUser) {
      console.log('\n=== USUÁRIO RAUAN ===');
      console.log(`ID: ${rauanUser.id}`);
      console.log(`Email: ${rauanUser.email}`);
      console.log(`Tipo: ${rauanUser.userType}`);
      console.log(`Nome: ${rauanUser.name}`);
    } else {
      console.log('\n❌ Usuário rauanconceicao789@gmail.com não encontrado!');
    }
    
    // Verificar o admin
    const adminUser = allUsers.find(u => u.email === 'admin@agendoai.com');
    if (adminUser) {
      console.log('\n=== USUÁRIO ADMIN ===');
      console.log(`ID: ${adminUser.id}`);
      console.log(`Email: ${adminUser.email}`);
      console.log(`Tipo: ${adminUser.userType}`);
      console.log(`Nome: ${adminUser.name}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
  } finally {
    await client.end();
  }
}

checkUsers(); 