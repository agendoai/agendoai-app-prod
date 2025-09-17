import { Router } from "express";
import { db } from "../db.js";
import { appointments } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// Rota para atualizar status de agendamento (incluindo pagamento)
router.put("/appointment/:id/status", async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const { status, paymentStatus } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: "ID do agendamento é obrigatório" });
    }

    // Buscar agendamento atual para pegar o providerId
    const [currentAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!currentAppointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    // Atualizar agendamento
    const result = await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, appointmentId))
      .returning();

    if (result.length === 0) {
      return res.status(500).json({ error: "Erro ao atualizar agendamento" });
    }

    console.log(`📅 APPOINTMENT UPDATE - ID ${appointmentId}:`, updateData);

    // Se o status foi alterado para 'completed', atualizar saldo do prestador
    if (status && status === 'completed') {
      
      try {
        const { BalanceService } = await import('../services/balance-service.js');
        await BalanceService.syncProviderBalance(currentAppointment.providerId);
        console.log(`💰 STATUS COMPLETED - Saldo do provider ${currentAppointment.providerId} atualizado após conclusão do serviço`);
      } catch (error) {
        console.error(`Erro ao atualizar saldo do provider ${currentAppointment.providerId}:`, error);
      }
    }

    res.json({
      success: true,
      message: "Agendamento atualizado com sucesso",
      appointment: result[0]
    });

  } catch (error) {
    console.error("Erro ao atualizar status do agendamento:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
