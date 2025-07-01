/**
 * Serviço de integração com email transacional usando SendGrid
 */
import { MailService } from '@sendgrid/mail';
import { createLogger } from './logger';

// Inicialização do logger
const logger = createLogger('EmailService');

class EmailService {
  private mailService: MailService;
  private initialized = false;
  private defaultSender: string;

  constructor() {
    this.mailService = new MailService();
    this.defaultSender = 'noreply@agendoai.com';
    this.initialize();
  }

  /**
   * Inicializa o serviço de email
   * @param customApiKey Chave de API personalizada (opcional)
   */
  initialize(customApiKey?: string): void {
    const apiKey = customApiKey || process.env.SENDGRID_API_KEY;
    
    if (apiKey) {
      try {
        this.mailService.setApiKey(apiKey);
        this.initialized = true;
        logger.info('Serviço de email inicializado com sucesso');
      } catch (error) {
        logger.error('Erro ao inicializar serviço de email:', error);
      }
    } else {
      logger.warn('SENDGRID_API_KEY não encontrada. Serviço de email não inicializado');
    }
  }

  /**
   * Verifica se o serviço está inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Envia um email
   * @param to Destinatário
   * @param subject Assunto
   * @param textContent Conteúdo texto plano
   * @param htmlContent Conteúdo HTML
   * @param from Remetente (opcional, usa o padrão se não informado)
   * @returns Promise<boolean> Indicando sucesso/falha
   */
  async sendEmail(
    to: string,
    subject: string,
    textContent: string,
    htmlContent: string,
    from: string = this.defaultSender
  ): Promise<boolean> {
    if (!this.initialized) {
      logger.error('Tentativa de enviar email com serviço não inicializado');
      return false;
    }

    try {
      const msg = {
        to,
        from,
        subject,
        text: textContent,
        html: htmlContent,
      };

      await this.mailService.send(msg);
      logger.info(`Email enviado com sucesso para: ${to}`);
      return true;
    } catch (error) {
      logger.error(`Erro ao enviar email para ${to}:`, error);
      return false;
    }
  }

  /**
   * Envia email de confirmação de agendamento
   * @param to Email do destinatário
   * @param appointmentDetails Detalhes do agendamento
   * @returns Promise<boolean> Indicando sucesso/falha
   */
  async sendAppointmentConfirmation(to: string, appointmentDetails: any): Promise<boolean> {
    const { 
      appointmentId, 
      serviceName, 
      providerName, 
      date, 
      time, 
      price 
    } = appointmentDetails;

    const subject = `Confirmação de Agendamento #${appointmentId}`;
    
    const textContent = `
      Olá!
      
      Seu agendamento foi confirmado com sucesso.
      
      Detalhes:
      - Serviço: ${serviceName}
      - Prestador: ${providerName}
      - Data: ${date}
      - Horário: ${time}
      - Valor: R$ ${(price / 100).toFixed(2)}
      
      Você pode visualizar todos os detalhes acessando o aplicativo AgendoAI.
      
      Atenciosamente,
      Equipe AgendoAI
    `;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://agendoai.com/logo.png" alt="AgendoAI Logo" style="max-width: 150px;">
        </div>
        
        <div style="background-color: #f9f9f9; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
          <h2 style="color: #00b4d8; margin-top: 0;">Confirmação de Agendamento</h2>
          <p style="margin-top: 0;">Olá! Seu agendamento foi confirmado com sucesso.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 10px;">Detalhes do Agendamento:</h3>
          <ul style="padding-left: 20px; list-style-type: none;">
            <li style="margin-bottom: 8px;"><strong>Serviço:</strong> ${serviceName}</li>
            <li style="margin-bottom: 8px;"><strong>Prestador:</strong> ${providerName}</li>
            <li style="margin-bottom: 8px;"><strong>Data:</strong> ${date}</li>
            <li style="margin-bottom: 8px;"><strong>Horário:</strong> ${time}</li>
            <li style="margin-bottom: 8px;"><strong>Valor:</strong> R$ ${(price / 100).toFixed(2)}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://agendoai.com/appointments/${appointmentId}" style="background-color: #00b4d8; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Ver Detalhes no App
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #666; font-size: 12px;">
          <p>Este é um email automático, por favor não responda.</p>
          <p>© ${new Date().getFullYear()} AgendoAI. Todos os direitos reservados.</p>
        </div>
      </div>
    `;
    
    return this.sendEmail(to, subject, textContent, htmlContent);
  }

  /**
   * Envia email de recuperação de senha
   * @param to Email do destinatário
   * @param resetToken Token de recuperação
   * @param userName Nome do usuário (opcional)
   * @returns Promise<boolean> Indicando sucesso/falha
   */
  async sendPasswordReset(to: string, resetToken: string, userName?: string): Promise<boolean> {
    const resetLink = `https://agendoai.com/reset-password?token=${resetToken}`;
    const greeting = userName ? `Olá ${userName}!` : 'Olá!';
    
    const subject = 'Recuperação de Senha - AgendoAI';
    
    const textContent = `
      ${greeting}
      
      Recebemos uma solicitação para redefinir sua senha no AgendoAI.
      
      Para redefinir sua senha, clique no link abaixo:
      ${resetLink}
      
      Este link expirará em 24 horas.
      
      Se você não solicitou uma redefinição de senha, ignore este e-mail ou entre em contato com o suporte.
      
      Atenciosamente,
      Equipe AgendoAI
    `;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://agendoai.com/logo.png" alt="AgendoAI Logo" style="max-width: 150px;">
        </div>
        
        <div style="background-color: #f9f9f9; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
          <h2 style="color: #00b4d8; margin-top: 0;">Recuperação de Senha</h2>
          <p style="margin-top: 0;">${greeting} Recebemos uma solicitação para redefinir sua senha.</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p>Para redefinir sua senha, clique no botão abaixo:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #00b4d8; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Redefinir Senha
            </a>
          </div>
          
          <p style="margin-bottom: 8px;">O link expirará em 24 horas.</p>
          <p style="margin-bottom: 8px;">Se o botão não funcionar, você pode copiar e colar o link abaixo no seu navegador:</p>
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 3px; word-break: break-all;">
            ${resetLink}
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #666; font-size: 12px;">
          <p>Se você não solicitou uma redefinição de senha, ignore este e-mail ou entre em contato com nosso suporte.</p>
          <p>© ${new Date().getFullYear()} AgendoAI. Todos os direitos reservados.</p>
        </div>
      </div>
    `;
    
    return this.sendEmail(to, subject, textContent, htmlContent);
  }

  /**
   * Envia um email de teste para verificar a configuração do SendGrid
   * @param apiKey Chave de API do SendGrid (opcional)
   * @returns Promise<boolean> Indicando sucesso/falha
   */
  async sendTestEmail(apiKey?: string): Promise<boolean> {
    // Se uma chave for fornecida, inicializa temporariamente o serviço com ela
    const prevInitState = this.initialized;
    let resetService = false;
    
    if (apiKey) {
      try {
        this.mailService.setApiKey(apiKey);
        this.initialized = true;
        resetService = true;
      } catch (error) {
        logger.error('Erro ao configurar serviço para teste:', error);
        return false;
      }
    }
    
    // Endereço de email para o teste
    const testEmail = 'admin@agendoai.com';
    
    // Conteúdo do email de teste
    const subject = 'Teste de configuração do SendGrid';
    const textContent = 'Este é um email de teste para verificar a integração do SendGrid com o AgendoAI.';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #00b4d8;">Teste de Configuração SendGrid</h2>
        <p>Este é um email de teste para verificar a integração do SendGrid com o AgendoAI.</p>
        <p>Se você está vendo esta mensagem, a configuração foi bem-sucedida!</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          © ${new Date().getFullYear()} AgendoAI - Email de teste
        </p>
      </div>
    `;
    
    // Envia o email de teste
    const result = await this.sendEmail(testEmail, subject, textContent, htmlContent);
    
    // Restaura o estado anterior do serviço se usamos uma chave temporária
    if (resetService) {
      this.initialize();
      this.initialized = prevInitState;
    }
    
    return result;
  }

  /**
   * Envia email de boas-vindas ao usuário
   * @param to Email do destinatário
   * @param userName Nome do usuário
   * @param userType Tipo de usuário (client, provider, etc)
   * @returns Promise<boolean> Indicando sucesso/falha
   */
  async sendWelcomeEmail(to: string, userName: string, userType: string): Promise<boolean> {
    const appLink = 'https://agendoai.com';
    const userTypeFormatted = userType === 'provider' ? 'prestador' : 'cliente';
    
    const subject = 'Bem-vindo ao AgendoAI!';
    
    const textContent = `
      Olá ${userName}!
      
      Bem-vindo ao AgendoAI, sua plataforma de agendamento inteligente.
      
      ${userType === 'provider' 
        ? 'Como prestador, você agora pode oferecer seus serviços, gerenciar sua agenda e receber pagamentos de forma simples e prática.'
        : 'Como cliente, você agora pode agendar serviços, gerenciar seus compromissos e encontrar os melhores profissionais perto de você.'}
      
      Para começar, acesse: ${appLink}
      
      Atenciosamente,
      Equipe AgendoAI
    `;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://agendoai.com/logo.png" alt="AgendoAI Logo" style="max-width: 150px;">
        </div>
        
        <div style="background-color: #f9f9f9; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
          <h2 style="color: #00b4d8; margin-top: 0;">Bem-vindo ao AgendoAI!</h2>
          <p style="margin-top: 0;">Olá ${userName}! É um prazer ter você como ${userTypeFormatted}.</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          ${userType === 'provider' 
            ? `<p>Como prestador de serviços, você agora pode:</p>
              <ul style="padding-left: 20px;">
                <li style="margin-bottom: 8px;">Gerenciar sua agenda de forma inteligente</li>
                <li style="margin-bottom: 8px;">Configurar seus serviços e preços</li>
                <li style="margin-bottom: 8px;">Receber pagamentos integrados</li>
                <li style="margin-bottom: 8px;">Acompanhar seus resultados com análises detalhadas</li>
              </ul>`
            : `<p>Como cliente, você agora pode:</p>
              <ul style="padding-left: 20px;">
                <li style="margin-bottom: 8px;">Agendar serviços com facilidade</li>
                <li style="margin-bottom: 8px;">Encontrar os melhores profissionais próximos a você</li>
                <li style="margin-bottom: 8px;">Receber lembretes de compromissos</li>
                <li style="margin-bottom: 8px;">Avaliar seus atendimentos</li>
              </ul>`
          }
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appLink}" style="background-color: #00b4d8; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Começar Agora
            </a>
          </div>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #666; font-size: 12px;">
          <p>Obrigado por escolher o AgendoAI.</p>
          <p>© ${new Date().getFullYear()} AgendoAI. Todos os direitos reservados.</p>
        </div>
      </div>
    `;
    
    return this.sendEmail(to, subject, textContent, htmlContent);
  }
}

// Exporta uma instância única do serviço
export const emailService = new EmailService();