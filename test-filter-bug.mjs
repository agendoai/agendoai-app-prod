// Teste completo para verificar o bug na função filterPastTimeSlots

function filterPastTimeSlots(slots, date) {
  // Convertendo a data do agendamento para um objeto Date
  const bookingDate = new Date(date);
  const now = new Date();

  // Obtendo a data atual no mesmo formato
  const today = now.toISOString().split("T")[0];
  const bookingDateStr = bookingDate.toISOString().split("T")[0];

  console.log(`📅 Data de hoje: ${today}`);
  console.log(`📅 Data do agendamento: ${bookingDateStr}`);
  console.log(`⏰ Hora atual: ${now.getHours()}:${now.getMinutes()}`);

  // Se a data do agendamento está no futuro, retornar todos os slots
  if (bookingDateStr > today) {
    console.log(`✅ Data do agendamento (${bookingDateStr}) é futura, mantendo todos os slots.`);
    return slots;
  }

  // Se a data do agendamento é anterior à data atual, não retornar nenhum slot
  if (bookingDateStr < today) {
    console.log(`❌ Data do agendamento (${bookingDateStr}) já passou, removendo todos os slots.`);
    return [];
  }

  // Se chegou aqui, a data do agendamento é hoje
  // Horário atual
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  console.log(`⏰ Data é hoje, filtrando por horário atual: ${currentHour}:${currentMinute} (${currentTotalMinutes} minutos)`);

  // Filtra somente slots que ainda não passaram
  return slots.filter((slot) => {
    if (!slot.startTime) return false;

    const [slotHour, slotMinute] = slot.startTime.split(":").map(Number);
    const slotTotalMinutes = slotHour * 60 + slotMinute;

    // Dar uma margem de 15 minutos para agendamentos próximos da hora atual
    const marginMinutes = 15;
    const isPast = slotTotalMinutes < currentTotalMinutes + marginMinutes;

    console.log(`🕐 Slot ${slot.startTime} (${slotTotalMinutes} min) vs atual+margem (${currentTotalMinutes + marginMinutes} min) = ${isPast ? 'PASSADO' : 'FUTURO'}`);

    return !isPast;
  });
}

// Teste
const testSlots = [
  { startTime: "09:00", endTime: "09:30", isAvailable: true },
  { startTime: "10:00", endTime: "10:30", isAvailable: true },
  { startTime: "14:00", endTime: "14:30", isAvailable: true },
  { startTime: "16:00", endTime: "16:30", isAvailable: true },
  { startTime: "17:00", endTime: "17:30", isAvailable: true }
];

const testDate = "2025-09-16";

console.log(`🧪 Testando filterPastTimeSlots com data: ${testDate}`);
console.log(`📊 Slots de entrada: ${testSlots.length}`);

const filteredSlots = filterPastTimeSlots(testSlots, testDate);

console.log(`📊 Slots após filtro: ${filteredSlots.length}`);
console.log(`🔍 Slots restantes:`, filteredSlots.map(s => s.startTime));