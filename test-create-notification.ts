import { db } from './server/db.ts';
import { notifications } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function createTestNotification() {
  try {
    console.log('🔍 Criando notificação de teste para usuário ID 2...\n');
    
    // Criar notificação diretamente no banco
    const [notification] = await db.insert(notifications).values({
      userId: 2,
      title: 'Saque Concluído',
      message: 'Seu saque de R$ 100,00 foi processado com sucesso.',
      type: 'withdrawal_completed',
      read: false,
      createdAt: new Date()
    }).returning();
    
    console.log('✅ Notificação criada com sucesso!');
    console.log('ID:', notification.id);
    console.log('User ID:', notification.userId);
    console.log('Título:', notification.title);
    console.log('Mensagem:', notification.message);
    console.log('Tipo:', notification.type);
    console.log('Lida:', notification.read);
    console.log('Criada em:', notification.createdAt);
    
    // Verificar se a notificação foi salva
    console.log('\n🔍 Verificando se a notificação foi salva...');
    const savedNotifications = await db.select().from(notifications).where(eq(notifications.userId, 2));
    
    console.log(`📊 Total de notificações para usuário 2: ${savedNotifications.length}`);
    savedNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. ID: ${notif.id} - ${notif.title}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar notificação:', error);
  } finally {
    process.exit(0);
  }
}

createTestNotification();