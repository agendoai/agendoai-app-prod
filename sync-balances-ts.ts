import { db } from './server/db.js';
import { appointments, providerBalances } from './shared/schema.js';
import { eq } from 'drizzle-orm';

// Função para calcular saldo de um prestador
async function calculateProviderBalance(providerId: number): Promise<number> {
  try {
    // Buscar todos os agendamentos pagos do prestador
    const paidAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.providerId, providerId));

    // Filtrar agendamentos com pagamento confirmado
    const confirmedPayments = paidAppointments.filter(appointment => 
      // Status válidos: completed, confirmed, confirmado, executing (quando pago)
      (appointment.status === 'completed' || 
       appointment.status === 'confirmed' || 
       appointment.status === 'confirmado' || 
       appointment.status === 'executing') &&
      // Payment status confirmado/pago
      (appointment.paymentStatus === 'paid' || 
       appointment.paymentStatus === 'confirmed' || 
       appointment.paymentStatus === 'confirmado' || 
       appointment.paymentStatus === 'pago' || 
       appointment.paymentStatus === 'completed') &&
      appointment.totalPrice && appointment.totalPrice > 0
    );

    // Somar valores dos agendamentos pagos (convertendo de centavos para reais)
    const totalEarned = confirmedPayments.reduce((sum, appointment) => {
      const priceInReais = (appointment.totalPrice || 0) / 100; // Converter centavos para reais
      return sum + priceInReais;
    }, 0);

    console.log(`💰 Provider ${providerId}:`, {
      totalAppointments: paidAppointments.length,
      confirmedPayments: confirmedPayments.length,
      totalEarned,
      confirmedPaymentsDetails: confirmedPayments.map(a => ({
        id: a.id,
        status: a.status,
        paymentStatus: a.paymentStatus,
        totalPrice: a.totalPrice,
        priceInReais: (a.totalPrice || 0) / 100
      }))
    });

    return totalEarned;
  } catch (error) {
    console.error(`Error calculating balance for provider ${providerId}:`, error);
    return 0;
  }
}

// Função para sincronizar saldo de um prestador
async function syncProviderBalance(providerId: number): Promise<void> {
  try {
    // Calcular saldo total baseado em agendamentos
    const totalEarned = await calculateProviderBalance(providerId);

    // Buscar saldo atual do prestador
    const [existingBalance] = await db
      .select()
      .from(providerBalances)
      .where(eq(providerBalances.providerId, providerId))
      .limit(1);

    if (!existingBalance) {
      // Criar novo saldo
      await db.insert(providerBalances).values({
        providerId,
        balance: totalEarned.toString(),
        availableBalance: totalEarned.toString(),
        pendingBalance: '0'
      });
      console.log(`✅ Created balance for provider ${providerId}: R$ ${totalEarned}`);
    } else {
      // Calcular saldo disponível considerando saques pendentes
      const currentPendingBalance = Number(existingBalance.pendingBalance) || 0;
      const newAvailableBalance = totalEarned - currentPendingBalance;

      // Atualizar saldo
      await db
        .update(providerBalances)
        .set({
          balance: totalEarned.toString(),
          availableBalance: Math.max(0, newAvailableBalance).toString()
        })
        .where(eq(providerBalances.providerId, providerId));

      console.log(`✅ Updated balance for provider ${providerId}:`, {
        totalEarned,
        pendingBalance: currentPendingBalance,
        availableBalance: Math.max(0, newAvailableBalance)
      });
    }
  } catch (error) {
    console.error(`Error syncing balance for provider ${providerId}:`, error);
  }
}

async function main() {
  console.log('🔄 Iniciando sincronização de saldos dos prestadores...');

  try {
    // Buscar todos os prestadores únicos dos agendamentos
    const providersWithAppointments = await db
      .selectDistinct({ providerId: appointments.providerId })
      .from(appointments);

    const validProviders = providersWithAppointments.filter(p => p.providerId);
    console.log(`🔄 Found ${validProviders.length} providers with appointments`);

    // Sincronizar cada prestador
    for (const provider of validProviders) {
      if (provider.providerId) {
        await syncProviderBalance(provider.providerId);
      }
    }

    console.log('✅ Sincronização concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    process.exit(1);
  }
}

main();
