import { db } from './server/db.js';
import { notifications } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testNotifications() {
  try {
    console.log('=== TESTE DE NOTIFICAÇÕES ===');
    
    // Verificar todas as notificações
    const allNotifications = await db.select().from(notifications);
    console.log('Total de notificações no banco:', allNotifications.length);
    
    if (allNotifications.length > 0) {
      console.log('\nPrimeiras 3 notificações:');
      allNotifications.slice(0, 3).forEach((notif, index) => {
        console.log(`${index + 1}. ID: ${notif.id}, UserID: ${notif.userId}, Título: ${notif.title}, Lida: ${notif.read}`);
      });
    }
    
    // Verificar notificações por usuário
    const userIds = [...new Set(allNotifications.map(n => n.userId))];
    console.log('\nNotificações por usuário:');
    
    for (const userId of userIds) {
      const userNotifications = await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId));
      
      const unreadCount = userNotifications.filter(n => !n.read).length;
      console.log(`Usuário ${userId}: ${userNotifications.length} total, ${unreadCount} não lidas`);
    }
    
  } catch (error) {
    console.error('Erro ao testar notificações:', error);
  } finally {
    process.exit(0);
  }
}

testNotifications();