// Temporary file to test the fix
const renderTimeSlotStep = () => {
  if (!selectedProvider || !selectedDate) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-2xl mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-yellow-800 font-semibold">Dados insuficientes para buscar horários.</p>
        <p className="text-yellow-700 text-sm mt-1">Selecione um prestador e uma data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4">
          <span className="text-2xl">⏰</span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Escolha o horário</h3>
        <p className="text-gray-600">
          {selectedDate && `Para ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
        </p>
      </div>

      {loadingSlots && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
          <p className="text-gray-600 font-medium">Carregando horários disponíveis...</p>
        </div>
      )}

      {!loadingSlots && timeSlots.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
            <span className="text-2xl">😔</span>
          </div>
          <p className="text-gray-500 font-medium">Nenhum horário disponível para esta data.</p>
        </div>
      )}

      {!loadingSlots && timeSlots.length > 0 && (
        <div className="max-h-[40vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {timeSlots.map((slot, index) => (
            <button
              key={index}
              className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 transform hover:scale-[1.02] ${
                selectedTimeSlot?.startTime === slot.startTime
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-xl'
                  : 'bg-white border border-gray-200 hover:border-teal-300 hover:shadow-lg'
              }`}
              onClick={() => handleTimeSlotSelect(slot)}
            >
              <div className="text-center">
                <div className={`font-bold text-lg ${
                  selectedTimeSlot?.startTime === slot.startTime ? 'text-white' : 'text-gray-800'
                }`}>
                  {slot.startTime}
                </div>
                <div className={`text-sm ${
                  selectedTimeSlot?.startTime === slot.startTime ? 'text-white/80' : 'text-gray-500'
                }`}>
                  até {slot.endTime}
                </div>
              </div>
              {selectedTimeSlot?.startTime === slot.startTime && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </button>
            ))}
          </div>
        )}

        {selectedTimeSlot && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
              <span className="text-green-800 font-semibold">
                Horário selecionado: {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
              </span>
            </div>
          </div>
        )}
        
        {/* Botão de continuar dentro da etapa */}
        {selectedTimeSlot && (
          <div className="pt-6">
            <Button 
              className="w-full h-14 rounded-xl text-lg font-bold shadow-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white transition-all transform hover:scale-[1.02]" 
              onClick={handleNext}
              disabled={loadingSlots}
            >
              Ir para Pagamento <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    );
  };