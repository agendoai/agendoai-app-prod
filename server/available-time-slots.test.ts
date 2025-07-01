import { 
  getAvailableTimeSlots, 
  getAvailableTimeSlotsAdvanced, 
  ProviderSchedule
} from './available-time-slots';

describe('getAvailableTimeSlots', () => {
  test('deve retornar slots de 30 minutos em um dia sem agendamentos', () => {
    const schedule: ProviderSchedule = {
      workingHours: { start: "08:00", end: "12:00" },
      appointments: []
    };

    const slots = getAvailableTimeSlots(schedule, 30);

    // Intervalos esperados para serviço de 30 minutos:
    // 08:00-08:30, 08:30-09:00, ..., 11:30-12:00
    expect(slots.length).toBe(8); // 4 horas * 2 slots por hora
    expect(slots[0]).toEqual({ startTime: "08:00", endTime: "08:30" });
    expect(slots[1]).toEqual({ startTime: "08:30", endTime: "09:00" });
    expect(slots[slots.length - 1]).toEqual({ startTime: "11:30", endTime: "12:00" });
  });

  test('deve considerar agendamentos existentes', () => {
    const schedule: ProviderSchedule = {
      workingHours: { start: "08:00", end: "12:00" },
      appointments: [
        { startTime: "09:00", duration: 60 }, // 9:00 - 10:00
        { startTime: "11:00", duration: 30 }  // 11:00 - 11:30
      ]
    };

    const slots = getAvailableTimeSlots(schedule, 30);

    // Verificar slots conflitantes com o primeiro agendamento
    const conflictSlots1 = slots.filter(
      slot => slot.startTime >= "09:00" && slot.startTime < "10:00"
    );
    expect(conflictSlots1.length).toBe(0);

    // Verificar slots conflitantes com o segundo agendamento
    const conflictSlots2 = slots.filter(
      slot => slot.startTime >= "11:00" && slot.startTime < "11:30"
    );
    expect(conflictSlots2.length).toBe(0);

    // Verificar slots antes do primeiro agendamento
    expect(slots.some(slot => slot.startTime === "08:00")).toBe(true);
    expect(slots.some(slot => slot.startTime === "08:30")).toBe(true);

    // Verificar slots entre os agendamentos
    expect(slots.some(slot => slot.startTime === "10:00")).toBe(true);
    expect(slots.some(slot => slot.startTime === "10:30")).toBe(true);

    // Verificar slot após o último agendamento
    expect(slots.some(slot => slot.startTime === "11:30")).toBe(true);
  });
});

describe('getAvailableTimeSlotsAdvanced', () => {
  test('deve priorizar horários "redondos"', () => {
    const schedule: ProviderSchedule = {
      workingHours: { start: "08:00", end: "12:00" },
      appointments: []
    };

    const slots = getAvailableTimeSlotsAdvanced(schedule, 30);

    // Deve conter todos os slots em alguma ordem
    const expectedSlots = [
      "08:00", "08:30", "09:00", "09:30",
      "10:00", "10:30", "11:00", "11:30"
    ];

    // Verificar se todos os slots esperados estão presentes
    expectedSlots.forEach(time => {
      expect(slots.some(slot => slot.startTime === time)).toBe(true);
    });

    // Verificar se os horários "redondos" aparecem primeiro
    const firstFourSlots = slots.slice(0, 4).map(slot => slot.startTime);
    expect(firstFourSlots).toContain("08:00");
    expect(firstFourSlots).toContain("09:00");
    expect(firstFourSlots).toContain("10:00");
    expect(firstFourSlots).toContain("11:00");
  });

  test('deve gerar slots corretos com serviço longo', () => {
    const schedule: ProviderSchedule = {
      workingHours: { start: "08:00", end: "18:00" },
      lunchBreak: { start: "12:00", end: "13:00" },
      appointments: [
        { startTime: "10:00", duration: 60 }
      ]
    };

    const slots = getAvailableTimeSlotsAdvanced(schedule, 120);

    // Verificar slots esperados
    const expectedSlots = [
      { startTime: "08:00", endTime: "10:00" },
      { startTime: "13:00", endTime: "15:00" },
      { startTime: "15:00", endTime: "17:00" }
    ];

    expect(slots).toEqual(expectedSlots);
  });
});