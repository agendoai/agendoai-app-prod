import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { users } from '../shared/schema.js';

// Configuração do banco
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agendoai';
const client = postgres(connectionString);
const db = drizzle(client);

async function createClientUser() {
  try {
    console.log('Criando usuário cliente de teste...');
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // Dados do usuário cliente
    const clientUser = {
      email: 'cliente@teste.com',
      password: hashedPassword,
      name: 'Cliente Teste',
      phone: '+5511999999998',
      cpf: '12345678901',
      userType: 'client',
      isActive: true,
      isVerified: true,
      profileImage: '/uploads/profiles/default.png'
    };
    
    // Inserir usuário
    const result = await db.insert(users).values(clientUser).returning();
    
    console.log('✅ Usuário cliente criado com sucesso!');
    console.log('📧 Email: cliente@teste.com');
    console.log('🔑 Senha: 123456');
    console.log('👤 Tipo: client');
    console.log('ID:', result[0].id);
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
  } finally {
    await client.end();
  }
}

createClientUser(); 