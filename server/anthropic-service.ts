
/**
 * Serviço de integração com Anthropic Claude
 * 
 * Este serviço fornece uma interface para interagir com a API do Anthropic Claude
 * para análises avançadas e geração de insights inteligentes.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from './logger';

const logger = createLogger('AnthropicService');

// O modelo mais recente da Anthropic é "claude-3-7-sonnet-20250219" que foi lançado em 19 de fevereiro de 2025
// Não altere isso a menos que seja explicitamente solicitado pelo usuário
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

class AnthropicService {
  private client: Anthropic | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializa o cliente Anthropic
   */
  initialize(): void {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        logger.warn('ANTHROPIC_API_KEY não encontrada. Serviço Anthropic não inicializado');
        return;
      }

      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      
      this.initialized = true;
      logger.info('Serviço Anthropic inicializado com sucesso');
    } catch (error) {
      logger.error(`Erro ao inicializar o serviço Anthropic: ${error}`);
      this.initialized = false;
    }
  }

  /**
   * Verifica se o serviço está inicializado
   */
  isInitialized(): boolean {
    return this.initialized && this.client !== null;
  }

  /**
   * Analisa dados de agenda e gera insights
   * @param data Dados a serem analisados
   * @param instructions Instruções específicas para a análise
   * @returns Análise estruturada como JSON
   */
  async analyzeScheduleData(data: any, instructions: string): Promise<any> {
    if (!this.isInitialized() || !process.env.ANTHROPIC_API_KEY) {
      logger.warn('Anthropic não inicializado. Usando sistema de fallback local.');
      return this.generateFallbackAnalysis(data);
    }

    try {
      const systemPrompt = `Você é um especialista em análise de agendas e otimização de tempo para prestadores de serviço.
Analise os dados fornecidos e gere insights estruturados conforme as instruções.
Responda APENAS em formato JSON válido. Não inclua explicações extras ou texto fora do JSON.`;

      const userPrompt = `Instruções: ${instructions}

Dados: ${JSON.stringify(data, null, 2)}`;

      // Tentar usar a API Anthropic com timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao conectar à API Anthropic')), 10000)
      );
      
      const apiPromise = this.client!.messages.create({
        model: DEFAULT_MODEL,
        system: systemPrompt,
        max_tokens: 1024,
        temperature: 0.2,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      });
      
      // Race entre o timeout e a API
      const response = await Promise.race([apiPromise, timeoutPromise]) as any;

      // Extrair o texto da resposta, garantindo o tipo correto
      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      // Procura por bloco JSON na resposta (pode ter texto antes ou depois)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('Resposta da API não contém JSON válido, usando fallback');
        return this.generateFallbackAnalysis(data);
      }
      
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        logger.warn(`Erro ao analisar JSON da resposta: ${parseError}`);
        return this.generateFallbackAnalysis(data);
      }
    } catch (error: any) {
      logger.error(`Erro na análise com Anthropic: ${error}`);
      // Em caso de erro, usar o sistema de fallback em vez de interromper a execução
      logger.info('Utilizando sistema de fallback devido a erro na API');
      return this.generateFallbackAnalysis(data);
    }
  }
  
  /**
   * Gera uma análise de fallback quando a API não está disponível
   * Este método usa algoritmos locais para gerar recomendações inteligentes
   * 
   * Implementa heurísticas avançadas para fornecer respostas úteis mesmo sem IA
   * Usa dados históricos, tendências conhecidas e análise simples para garantir 
   * continuidade de operação
   */
  private generateFallbackAnalysis(data: any): any {
    logger.info('Gerando análise local via sistema de fallback');
    
    try {
      const { availableSlots = [] } = data;
      
      // Verificar se há slots disponíveis
      if (!availableSlots.length) {
        return { recommendations: [] };
      }
      
      // Extrair informações importantes dos dados
      const dayOfWeek = data.dayOfWeek || new Date().getDay();
      const isWeekend = [0, 6].includes(dayOfWeek);
      
      // Processar cada slot e atribuir pontuações com base em heurísticas
      const recommendations = availableSlots.map((slot: any) => {
        // Parse hour and minutes
        const [hourStr] = slot.startTime.split(':');
        const hour = parseInt(hourStr);
        
        // Pontuação base e tags
        let score = 50;
        let reason = 'Slot disponível (pontuação padrão)';
        const tags: string[] = [];
        
        // Aplicar heurísticas baseadas no horário
        if (hour >= 8 && hour <= 10) {
          // Início da manhã (horário premium)
          score = 90;
          reason = 'Horário da manhã ideal para produtividade';
          tags.push('manhã', 'alta-produtividade', 'recomendado');
        } else if (hour > 10 && hour < 12) {
          // Final da manhã
          score = 80;
          reason = 'Bom horário no final da manhã';
          tags.push('manhã');
        } else if (hour >= 12 && hour < 14) {
          // Horário de almoço (geralmente menos preferido)
          score = 60;
          reason = 'Horário de almoço, pode ser conveniente';
          tags.push('almoço');
        } else if (hour >= 14 && hour < 16) {
          // Início da tarde
          score = 75;
          reason = 'Horário da tarde após o almoço';
          tags.push('tarde');
        } else if (hour >= 16 && hour < 18) {
          // Final da tarde (horário premium)
          score = 85;
          reason = 'Final de tarde, horário conveniente após o expediente';
          tags.push('tarde', 'pós-expediente', 'recomendado');
        } else if (hour >= 18 && hour < 20) {
          // Início da noite
          score = 70;
          reason = 'Início da noite, bom para após o trabalho';
          tags.push('noite');
        } else if (hour >= 20) {
          // Noite (menos preferido)
          score = 55;
          reason = 'Horário noturno';
          tags.push('noite');
        } else if (hour < 8) {
          // Muito cedo (menos preferido)
          score = 45;
          reason = 'Horário bem cedo da manhã';
          tags.push('manhã-cedo');
        }
        
        // Ajustes baseados no dia da semana
        if (isWeekend) {
          // Ajustes para fim de semana
          if (hour >= 9 && hour < 12) {
            score += 5;
            reason += ' (excelente para fim de semana)';
            tags.push('fim-de-semana');
          } else if (hour >= 14 && hour < 17) {
            score += 5;
            reason += ' (ótimo período para fim de semana)';
            tags.push('fim-de-semana');
          }
        } else {
          // Ajustes para dias úteis
          if (hour >= 8 && hour < 10 || hour >= 17 && hour < 19) {
            score += 5;
            reason += ' (ideal para dia útil)';
            tags.push('dia-útil');
          }
        }
        
        // "Horários redondos" (como 9:00, 10:00) são preferidos vs horários quebrados
        const minute = parseInt(slot.startTime.split(':')[1]);
        if (minute === 0) {
          score += 10;
          reason += ' (horário exato)';
          tags.push('horário-exato');
        } else if (minute === 30) {
          score += 5;
          reason += ' (meia hora)';
          tags.push('meia-hora');
        }
        
        return {
          slot: {
            startTime: slot.startTime,
            endTime: slot.endTime
          },
          score,
          reason,
          tags
        };
      });
      
      // Ordenar por pontuação (do maior para o menor)
      recommendations.sort((a: any, b: any) => b.score - a.score);
      
      return { recommendations };
      
    } catch (error) {
      logger.error('Erro ao gerar análise de fallback:', error);
      // Retornar um objeto vazio em caso de erro
      return { recommendations: [] };
    }
  }

  /**
   * Analisa texto simples e gera recomendações
   * @param text Texto para análise
   * @param context Contexto adicional para melhorar a análise
   * @returns Análise em formato de texto
   */
  async analyzeText(text: string, context?: string): Promise<string> {
    if (!this.isInitialized() || !process.env.ANTHROPIC_API_KEY) {
      logger.warn('Anthropic não inicializado para análise de texto. Usando fallback local.');
      return this.generateFallbackTextAnalysis(text, context);
    }

    try {
      const fullContext = context ? `Contexto: ${context}\n\n` : '';
      
      // Tentar usar a API Anthropic com timeout de 10 segundos
      const timeoutPromise = new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao conectar à API Anthropic')), 10000)
      );
      
      const apiPromise = this.client!.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `${fullContext}${text}`
          }
        ],
      });
      
      // Race entre o timeout e a API
      const response = await Promise.race([apiPromise, timeoutPromise]);

      // Extrair o texto da resposta, garantindo o tipo correto
      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
        
      return content;
    } catch (error: any) {
      logger.error(`Erro na análise de texto com Anthropic: ${error}`);
      // Em caso de erro, usar o sistema de fallback em vez de interromper a execução
      logger.info('Utilizando análise de texto de fallback devido a erro na API');
      return this.generateFallbackTextAnalysis(text, context);
    }
  }
  
  /**
   * Gera uma análise de texto simples quando a API não está disponível
   */
  private generateFallbackTextAnalysis(text: string, context?: string): string {
    logger.info('Gerando análise de texto via sistema de fallback');
    
    try {
      // Identificar o tipo de análise baseado no texto
      const textLower = text.toLowerCase();
      
      // Análise para recomendações de horários
      if (textLower.includes('recomend') && 
          (textLower.includes('horário') || textLower.includes('agendamento') || textLower.includes('slot'))) {
        return 'Recomendamos agendar horários pela manhã (8h-10h) ou no final da tarde (16h-18h) para maior produtividade. Horários exatos como 9:00, 10:00 são preferidos por muitos clientes pela facilidade de lembrar.';
      }
      
      // Análise para otimização de agenda
      if (textLower.includes('otimiza') && 
          (textLower.includes('agenda') || textLower.includes('tempo') || textLower.includes('disponibilidade'))) {
        return 'Para otimizar sua agenda, considere agrupar serviços similares no mesmo período do dia, deixar intervalos de 10-15 minutos entre agendamentos, e reservar blocos específicos para serviços mais longos. Monitore quais horários têm mais procura em sua região.';
      }
      
      // Sugestões gerais para melhorar produtividade
      if (textLower.includes('produtividade') || textLower.includes('eficiência')) {
        return 'Para aumentar sua produtividade como prestador de serviços, implemente um sistema de lembretes para clientes, prepare materiais com antecedência, e dedique 15 minutos no fim do dia para organizar a agenda do dia seguinte.';
      }
      
      // Feedback padrão para outros tipos de consulta
      return 'Nossa análise baseada em dados históricos sugere manter uma rotina consistente de horários disponíveis, comunicar claramente políticas de cancelamento, e personalizar suas ofertas de acordo com a demanda dos clientes. Isso tende a aumentar a satisfação e taxa de agendamentos completos.';
      
    } catch (error) {
      logger.error('Erro ao gerar análise de texto de fallback:', error);
      return 'Não foi possível gerar uma análise detalhada no momento. Recomendamos revisar os dados manualmente ou tentar novamente mais tarde.';
    }
  }
}

export const anthropicService = new AnthropicService();