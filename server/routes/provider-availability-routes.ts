import { Router } from 'express';
import { z } from 'zod';
import { timeSlotGenerator } from '../time-slot-generator';
import { storage } from '../storage';
import { startOfWeek, addDays, format } from 'date-fns';

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

// Rota para salvar disponibilidade semanal
router.post('/weekly', async (req, res) => {
  try {
    const { providerId, days } = req.body;
    // Removido log de debug por segurança
    if (!providerId || !Array.isArray(days)) {
      return res.status(400).json({ error: 'providerId e days[] são obrigatórios' });
    }
    // Descobrir o domingo da semana atual
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // 0 = domingo
    const results = [];
    for (const day of days) {
      const { dayOfWeek, startTime, endTime, intervalMinutes, isAvailable, providerId } = day;
      // Calcular a data real para o dayOfWeek
      const date = addDays(weekStart, dayOfWeek);
      const dateStr = format(date, 'yyyy-MM-dd');
      // Removido log de debug por segurança
      // Salvar na tabela availability
      const availability = await storage.createAvailability({
        providerId,
        dayOfWeek,
        startTime,
        endTime,
        intervalMinutes,
        isAvailable,
        date: dateStr,
      });
      results.push(availability);
    }
    return res.json({ success: true, availabilities: results });
  } catch (error) {
    console.error('Erro ao salvar disponibilidade semanal:', error);
    return res.status(500).json({ error: 'Erro ao salvar disponibilidade semanal' });
  }
});

// Rota para buscar todas as disponibilidades de um provider
router.get('/provider/:providerId', async (req, res) => {
  try {
    const providerId = Number(req.params.providerId);
    if (!providerId) {
      return res.status(400).json({ error: 'providerId é obrigatório' });
    }
    const availabilities = await storage.getAvailabilityByProviderId(providerId);
    return res.json(availabilities);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar disponibilidades do provider' });
  }
});

// Rota para buscar todos os bloqueios de horários de um provider
router.get('/blocked-times/provider/:providerId', async (req, res) => {
  try {
    const providerId = Number(req.params.providerId);
    if (!providerId) {
      return res.status(400).json({ error: 'providerId é obrigatório' });
    }
    const blockedTimes = await storage.getBlockedTimesByProviderId(providerId);
    return res.json(blockedTimes);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar bloqueios de horários do provider' });
  }
});

// Rota para criar bloqueio de horário
router.post('/blocked-times', async (req, res) => {
  try {
    const { providerId, date, startTime, endTime, reason } = req.body;
    
    if (!providerId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'providerId, date, startTime e endTime são obrigatórios' });
    }

    // Buscar uma disponibilidade existente para o provider ou criar uma temporária
    const availabilities = await storage.getAvailabilityByProviderId(providerId);
    let availabilityId = null;
    
    if (availabilities && availabilities.length > 0) {
      // Usar a primeira disponibilidade encontrada
      availabilityId = availabilities[0].id;
    } else {
      // Criar uma disponibilidade temporária se não existir
      const tempAvailability = await storage.createAvailability({
        providerId: Number(providerId),
        dayOfWeek: new Date(date).getDay(),
        startTime: '08:00',
        endTime: '18:00',
        isAvailable: true,
        intervalMinutes: 30,
        date: date
      });
      availabilityId = tempAvailability.id;
    }

    const blockedTime = await storage.createBlockedTime({
      providerId: Number(providerId),
      availabilityId: availabilityId,
      date,
      startTime,
      endTime,
      reason: reason || 'Bloqueio manual'
    });

    return res.status(201).json(blockedTime);
  } catch (error) {
    console.error('Erro ao criar bloqueio de horário:', error);
    return res.status(500).json({ error: 'Erro ao criar bloqueio de horário' });
  }
});

export default router;
