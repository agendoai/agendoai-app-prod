/**
 * Compartilha uma mensagem diretamente no WhatsApp
 * @param message Mensagem a ser compartilhada
 * @param phoneNumber Número de telefone (opcional, se não fornecido abre a seleção de contato)
 */
export function shareOnWhatsApp(message: string, phoneNumber?: string): void {
  try {
    // Codificar a mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Construir URL do WhatsApp
    let whatsappUrl = `https://wa.me/`;
    
    // Adicionar número de telefone se fornecido
    if (phoneNumber) {
      // Remover caracteres não numéricos do número
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      whatsappUrl += cleanPhone;
    }
    
    // Adicionar a mensagem
    whatsappUrl += `?text=${encodedMessage}`;
    
    // Abrir em nova janela/aba
    window.open(whatsappUrl, '_blank');
  } catch (error) {
    console.error('Erro ao compartilhar no WhatsApp:', error);
  }
}

/**
 * Gera um link para o WhatsApp
 * @param phoneNumber Número de telefone (com código do país, sem formatação)
 * @param message Mensagem a ser compartilhada
 * @returns URL formatada para o WhatsApp
 */
export function generateWhatsAppLink(phoneNumber: string, message: string): string {
  try {
    // Remover caracteres não numéricos do número
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Codificar a mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Construir e retornar a URL
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  } catch (error) {
    console.error('Erro ao gerar link do WhatsApp:', error);
    return '#';
  }
}