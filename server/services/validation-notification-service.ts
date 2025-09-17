/**
 * Serviço para envio de códigos de validação aos clientes
 * Este é um exemplo de implementação que pode ser expandido para SMS, email, push notifications, etc.
 */

export interface NotificationData {
  clientId: number;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  validationCode: string;
  appointmentId: number;
  serviceName: string;
  providerName: string;
  appointmentDate: string;
  appointmentTime: string;
}

/**
 * Envia o código de validação para o cliente
 * IMPORTANTE: O código NUNCA deve ser enviado ou mostrado ao prestador
 * @param {NotificationData} data - Dados da notificação
 * @returns {Promise<boolean>} True se enviado com sucesso
 */
export async function sendValidationCodeToClient(data: NotificationData): Promise<boolean> {
  try {
    console.log('🔐 ENVIANDO CÓDIGO DE VALIDAÇÃO PARA O CLIENTE');
    console.log('📱 Cliente:', data.clientName);
    console.log('📅 Agendamento:', data.serviceName, 'com', data.providerName);
    console.log('🕐 Data/Hora:', data.appointmentDate, 'às', data.appointmentTime);
    console.log('🔢 Código de validação:', data.validationCode);
    console.log('⚠️  ATENÇÃO: Este código deve ser fornecido APENAS ao cliente!');
    console.log('---');

    // SIMULAÇÃO: Em produção, aqui você implementaria:
    // 1. Envio por SMS usando Twilio, AWS SNS, etc.
    // 2. Envio por email usando SendGrid, AWS SES, etc.
    // 3. Push notification no app do cliente
    // 4. Notificação in-app

    // Exemplo de implementação com SMS (comentado):
    /*
    if (data.clientPhone) {
      await sendSMS({
        to: data.clientPhone,
        message: `Seu código de validação para o agendamento ${data.serviceName} é: ${data.validationCode}. Forneça este código ao prestador apenas quando o serviço for concluído.`
      });
    }
    */

    // Exemplo de implementação com email (comentado):
    /*
    if (data.clientEmail) {
      await sendEmail({
        to: data.clientEmail,
        subject: 'Código de Validação - AgendoAI',
        html: `
          <h2>Código de Validação</h2>
          <p>Seu agendamento foi criado com sucesso!</p>
          <p><strong>Serviço:</strong> ${data.serviceName}</p>
          <p><strong>Prestador:</strong> ${data.providerName}</p>
          <p><strong>Data:</strong> ${data.appointmentDate} às ${data.appointmentTime}</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
            <h3>Código de Validação</h3>
            <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px;">${data.validationCode}</h1>
          </div>
          <p><strong>IMPORTANTE:</strong> Forneça este código ao prestador apenas quando o serviço for totalmente concluído.</p>
        `
      });
    }
    */

    // Por enquanto, simula sucesso
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar código de validação:', error);
    return false;
  }
}

/**
 * Envia notificação ao cliente sobre bloqueio por tentativas excessivas
 * @param {object} data - Dados da notificação
 * @returns {Promise<boolean>} True se enviado com sucesso
 */
export async function notifyClientAboutBlockedValidation(data: {
  clientId: number;
  clientName: string;
  appointmentId: number;
  serviceName: string;
}): Promise<boolean> {
  try {
    console.log('🚫 NOTIFICANDO CLIENTE SOBRE BLOQUEIO DE VALIDAÇÃO');
    console.log('📱 Cliente:', data.clientName);
    console.log('📅 Agendamento ID:', data.appointmentId);
    console.log('⚠️  Motivo: Muitas tentativas de validação incorretas');
    console.log('💡 Ação: Cliente deve entrar em contato com suporte');
    console.log('---');

    // Em produção, implementar notificação real
    return true;
  } catch (error) {
    console.error('❌ Erro ao notificar cliente sobre bloqueio:', error);
    return false;
  }
}

/**
 * Envia notificação ao cliente sobre conclusão bem-sucedida
 * @param {object} data - Dados da notificação
 * @returns {Promise<boolean>} True se enviado com sucesso
 */
export async function notifyClientAboutCompletedService(data: {
  clientId: number;
  clientName: string;
  appointmentId: number;
  serviceName: string;
  providerName: string;
}): Promise<boolean> {
  try {
    console.log('✅ NOTIFICANDO CLIENTE SOBRE SERVIÇO CONCLUÍDO');
    console.log('📱 Cliente:', data.clientName);
    console.log('📅 Serviço:', data.serviceName);
    console.log('👨‍💼 Prestador:', data.providerName);
    console.log('🎉 Status: Serviço concluído com sucesso!');
    console.log('---');

    // Em produção, implementar notificação real
    return true;
  } catch (error) {
    console.error('❌ Erro ao notificar cliente sobre conclusão:', error);
    return false;
  }
}