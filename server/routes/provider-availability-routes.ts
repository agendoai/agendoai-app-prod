import { Router } from 'express';
import { z } from 'zod';
import { timeSlotGenerator } from '../time-slot-generator';
import { storage } from '../storage';

const router = Router();

const availabilityParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceDuration: z.number().positive(),
});

const validateProviderAvailabilityParams = (req: any, res: any, next: any) => {
  try {
    const { date, serviceDuration } = req.query;
    availabilityParamsSchema.parse({
      date,
      serviceDuration: Number(serviceDuration)
    });
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid parameters' });
  }
};

router.get('/:id/availability', 
  validateProviderAvailabilityParams,
  async (req, res) => {
    try {
      const providerId = Number(req.params.id);
      const date = new Date(req.query.date as string);
      const duration = Number(req.query.serviceDuration);

      const slots = await timeSlotGenerator.generateSlots(providerId, date, duration);
      res.json({ slots });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate availability slots' });
    }
  }
);

// Rota para adicionar ou atualizar horários disponíveis em um dia específico
router.post('/:providerId/availability', async (req, res) => {
  try {
    const providerId = Number(req.params.providerId);
    const { date, slots } = req.body;
    if (!date || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'Informe a data e pelo menos um slot de horário.' });
    }
    // slots: [{ startTime: '09:00', endTime: '12:00' }, ...]
    // Salvar ou substituir a disponibilidade do provedor para a data
    if (typeof storage.setAvailabilityByDate === 'function') {
      await storage.setAvailabilityByDate(providerId, date, slots);
    } else {
      // Implementação simples: remove todas as disponibilidades do dia e cria novas
      const existing = await storage.getAvailabilityByDate(providerId, date);
      if (Array.isArray(existing)) {
        for (const avail of existing) {
          await storage.deleteAvailability(avail.id);
        }
      } else if (existing && existing.id) {
        await storage.deleteAvailability(existing.id);
      }
      for (const slot of slots) {
        await storage.createAvailability({
          providerId,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: true,
          dayOfWeek: new Date(date).getDay(),
        });
      }
    }
    res.json({ success: true, providerId, date, slots });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar disponibilidade do provedor.' });
  }
});

export default router;
