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
    const result = await db
      .update(appointments)
      .set({ paymentStatus: "confirmado" })
      .where(eq(appointments.paymentId, paymentId));
    console.log(`Tentou atualizar agendamento com paymentId ${paymentId}. Result:`, result);

    if (result.rowCount === 0) {
      console.error(`Nenhum agendamento encontrado para paymentId ${paymentId}`);
    } else {
      console.log(`Agendamento com paymentId ${paymentId} confirmado!`);
    }
    return res.status(200).json({ received: true });
  }
  res.json({ ok: true, message: "POST do webhook ativo" });
});

export default router; 