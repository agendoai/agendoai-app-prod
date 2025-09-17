import { db } from './server/db.ts';
import { notifications } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function checkNotifications() {
  try {
    console.log('🔍 Verificando notificações no banco de dados...\n');
    
    // Buscar todas as notificações
    const allNotifications = await db.select().from(notifications);
    console.log(`📊 Total de notificações: ${allNotifications.length}\n`);
    
    if (allNotifications.length > 0) {
      console.log('📋 Todas as notificações:');
      allNotifications.forEach((notification, index) => {
        console.log(`${index + 1}. ID: ${notification.id}`);
        console.log(`   User ID: ${notification.userId}`);
        console.log(`   Título: ${notification.title}`);
        console.log(`   Mensagem: ${notification.message}`);
        console.log(`   Tipo: ${notification.type}`);
        console.log(`   Lida: ${notification.read}`);
        console.log(`   Criada em: ${notification.createdAt}`);
        console.log('   ---');
      });
    }
    
    // Verificar especificamente para o usuário ID 2
    console.log('\n🎯 Notificações para o usuário ID 2:');
    const user2Notifications = await db.select().from(notifications).where(eq(notifications.userId, 2));
    
    if (user2Notifications.length > 0) {
      console.log(`✅ Encontradas ${user2Notifications.length} notificação(ões):`);
      user2Notifications.forEach((notification, index) => {
        console.log(`${index + 1}. ID: ${notification.id}`);
        console.log(`   Título: ${notification.title}`);
        console.log(`   Mensagem: ${notification.message}`);
        console.log(`   Tipo: ${notification.type}`);
        console.log(`   Lida: ${notification.read}`);
        console.log(`   Criada em: ${notification.createdAt}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ Nenhuma notificação encontrada para o usuário ID 2');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar notificações:', error);
  } finally {
    process.exit(0);
  }
}

checkNotifications();