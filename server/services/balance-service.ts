import { db } from '../db.js';
import { appointments, providerBalances } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { storage } from '../storage.js';

export class BalanceService {
  /**
   * Calcula o saldo total baseado em agendamentos pagos
   */
  static async calculateProviderBalance(providerId: number): Promise<number> {
    try {
      // Buscar todos os agendamentos pagos do prestador
      const paidAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.providerId, providerId),
            // Agendamentos concluídos ou confirmados
            // com status de pagamento pago/confirmado
          )
        );

      // Filtrar agendamentos concluídos (apenas status 'completed')
      const completedAppointments = paidAppointments.filter(appointment => 
        // Apenas agendamentos com status 'completed' devem gerar saldo
        appointment.status === 'completed' &&
        appointment.totalPrice && appointment.totalPrice > 0
      );

      // Somar valores dos agendamentos concluídos (convertendo de centavos para reais)
      const totalEarned = completedAppointments.reduce((sum, appointment) => {
        const priceInReais = (appointment.totalPrice || 0) / 100; // Converter centavos para reais
        return sum + priceInReais;
      }, 0);

      console.log(`💰 BALANCE SERVICE - Provider ${providerId}:`, {
        totalAppointments: paidAppointments.length,
        completedAppointments: completedAppointments.length,
        totalEarned
      });

      return totalEarned;
    } catch (error) {
      console.error(`Error calculating balance for provider ${providerId}:`, error);
      return 0;
    }
  }

  /**
   * Sincroniza o saldo do prestador com base em agendamentos pagos
   */
  static async syncProviderBalance(providerId: number): Promise<void> {
    try {
      // Calcular saldo total baseado em agendamentos
      const totalEarned = await this.calculateProviderBalance(providerId);

      // Buscar saldo atual do prestador
      let providerBalance = await storage.getProviderBalance(providerId);

      // Criar saldo se não existe
      if (!providerBalance) {
        providerBalance = await storage.createProviderBalance({
          providerId,
          balance: totalEarned.toString(),
          availableBalance: totalEarned.toString(),
          pendingBalance: '0'
        });
        console.log(`✅ BALANCE SYNC - Created balance for provider ${providerId}: R$ ${totalEarned}`);
        return;
      }

      // Calcular saldo disponível considerando saques pendentes
      const currentPendingBalance = Number(providerBalance.pendingBalance) || 0;
      const newAvailableBalance = totalEarned - currentPendingBalance;

      // Atualizar saldo
      await storage.updateProviderBalance(providerId, {
        balance: totalEarned.toString(),
        availableBalance: Math.max(0, newAvailableBalance).toString()
      });

      console.log(`✅ BALANCE SYNC - Updated balance for provider ${providerId}:`, {
        totalEarned,
        pendingBalance: currentPendingBalance,
        availableBalance: Math.max(0, newAvailableBalance)
      });

    } catch (error) {
      console.error(`Error syncing balance for provider ${providerId}:`, error);
    }
  }

  /**
   * Atualiza saldo quando um agendamento é marcado como pago
   */
  static async onAppointmentPaid(appointmentId: number): Promise<void> {
    try {
      // Buscar o agendamento
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);

      if (!appointment || !appointment.providerId) {
        console.log(`⚠️ BALANCE SERVICE - Appointment ${appointmentId} not found or no provider`);
        return;
      }

      // Sincronizar saldo do prestador
      await this.syncProviderBalance(appointment.providerId);

      console.log(`💰 APPOINTMENT PAID - Synced balance for provider ${appointment.providerId} after appointment ${appointmentId}`);

    } catch (error) {
      console.error(`Error updating balance after appointment payment:`, error);
    }
  }

  /**
   * Sincroniza saldos de todos os prestadores (para migração inicial)
   */
  static async syncAllProviderBalances(): Promise<void> {
    try {
      // Buscar todos os prestadores únicos dos agendamentos
      const providersWithAppointments = await db
        .selectDistinct({ providerId: appointments.providerId })
        .from(appointments)
        .where(appointments.providerId);

      console.log(`🔄 SYNCING BALANCES - Found ${providersWithAppointments.length} providers with appointments`);

      // Sincronizar cada prestador
      for (const provider of providersWithAppointments) {
        if (provider.providerId) {
          await this.syncProviderBalance(provider.providerId);
        }
      }

      console.log(`✅ BALANCE SYNC COMPLETE - All provider balances updated`);

    } catch (error) {
      console.error('Error syncing all provider balances:', error);
    }
  }
}
