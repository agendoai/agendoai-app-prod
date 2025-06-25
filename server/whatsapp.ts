/**
 * Serviço de integração com WhatsApp
 * 
 * Este serviço fornece funções para enviar mensagens via WhatsApp usando
 * um link direto que abre o WhatsApp Web ou aplicativo.
 */

/**
 * Gera um link para enviar mensagem WhatsApp
 * @param phoneNumber Número de telefone no formato internacional (com código do país, sem + ou 00)
 * @param message Mensagem pré-preenchida (opcional)
 * @returns URL que abre o WhatsApp com o contato e mensagem
 */
export function generateWhatsAppLink(phoneNumber: string, message: string = ''): string {
  // Remove caracteres não numéricos
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Codifica a mensagem para URL
  const encodedMessage = encodeURIComponent(message);
  
  // Retorna o link do WhatsApp
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Formata um número de telefone para o formato internacional
 * @param phone Número de telefone (com ou sem formatação)
 * @param countryCode Código do país (padrão: 55 para Brasil)
 * @returns Número formatado para uso no WhatsApp
 */
export function formatPhoneForWhatsApp(phone: string, countryCode: string = '55'): string {
  // Remove todos os caracteres não numéricos
  const digits = phone.replace(/\D/g, '');
  
  // Se o número já começar com o código do país, não adiciona novamente
  if (digits.startsWith(countryCode)) {
    return digits;
  }
  
  // Remove o 0 inicial se existir (comum em alguns formatos de número no Brasil)
  const withoutInitialZero = digits.startsWith('0') ? digits.substring(1) : digits;
  
  // Adiciona o código do país
  return `${countryCode}${withoutInitialZero}`;
}

/**
 * Gera mensagem padrão para contato inicial com provedor de serviço
 * @param providerName Nome do prestador de serviço
 * @param serviceName Nome do serviço de interesse
 * @returns Mensagem formatada
 */
export function generateDefaultMessage(providerName: string, serviceName: string): string {
  return `Olá ${providerName}, estou interessado(a) no serviço de "${serviceName}" através do AgendoAI. Poderia me fornecer mais informações?`;
}