import { db } from '../db';
import { users } from '@shared/schema';
import { hashPassword } from '../auth';
import { eq } from 'drizzle-orm';

/**
 * Script para criar um usuário admin diretamente no banco de dados
 * Email: agendoai@gmail.com
 * Senha: 123456
 * Tipo: admin
 */

async function createAdminUser() {
  try {
    const email = 'adminagendoai@gmail.com';
    const password = '123456';
    const name = 'Admin User';
    const cpf = '12345678901'; // CPF padrão para usuários de teste
    
    // Verificar se o usuário já existe
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    
    if (existingUser.length > 0) {
      console.log(`Usuário com email ${email} já existe.`);
      console.log('ID:', existingUser[0].id);
      console.log('Tipo:', existingUser[0].userType);
      return;
    }
    
    // Hash da senha
    const hashedPassword = await hashPassword(password);
    
    // Criar o usuário admin
    const [newUser] = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      userType: 'admin',
      cpf,
      isActive: true,
      isVerified: true,
      createdAt: new Date()
    }).returning();
    
    console.log('✅ Usuário admin criado com sucesso!');
    console.log('ID:', newUser.id);
    console.log('Email:', newUser.email);
    console.log('Nome:', newUser.name);
    console.log('Tipo:', newUser.userType);
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
  }
}

// Executar o script
createAdminUser();