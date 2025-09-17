import { Router } from "express";
import { db } from "../db";
import { appointments } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Rota GET para teste rápido do webhook
router.get("/status/webhook", (req, res) => {
  res.json({ ok: true, message: "Webhook ativo" });
});

// Rota POST para o webhook do Asaas
router.post("/asaas", async (req, res) => {
  // Corrigir: parsear o JSON se vier em req.body.data
  let event = req.body;
  if (event && typeof event.data === 'string') {
    try {
      event = JSON.parse(event.data);
    } catch (e) {
      console.error('Erro ao parsear event.data:', e);
    }
  }

  const paymentId = event?.payment?.id;
  console.log('Webhook recebido:', event.event, 'paymentId:', paymentId, 'payload:', JSON.stringify(event));

  if (
    event &&
    (event.event === "PAYMENT_RECEIVED" ||
      (event.payment && event.payment.status === "RECEIVED"))
  ) {
    // Buscar o agendamento antes de atualizar para pegar o providerId
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.paymentId, paymentId))
      .limit(1);

    if (!appointment) {
      console.error(`Nenhum agendamento encontrado para paymentId ${paymentId}`);
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    // Atualizar status de pagamento
    const result = await db
      .update(appointments)
      .set({ paymentStatus: "confirmado" })
      .where(eq(appointments.paymentId, paymentId));
    console.log(`Tentou atualizar agendamento com paymentId ${paymentId}. Result:`, result);

    if (result.rowCount === 0) {
      console.error(`Erro ao atualizar agendamento com paymentId ${paymentId}`);
    } else {
      console.log(`Agendamento com paymentId ${paymentId} confirmado!`);
      // Saldo será atualizado apenas quando o status for alterado para 'completed' manualmente
    }
    return res.status(200).json({ received: true });
  }
  res.json({ ok: true, message: "POST do webhook ativo" });
});

export default router;