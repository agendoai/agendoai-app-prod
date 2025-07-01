import { useState } from "react";
import { useLocation } from "wouter";
import AppHeader from "@/components/layout/app-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsPage() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AppHeader title="Termos e Políticas" showBackButton />
      
      <Tabs defaultValue="terms" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-2 w-full rounded-none">
          <TabsTrigger value="terms">Termos de Uso</TabsTrigger>
          <TabsTrigger value="privacy">Política de Privacidade</TabsTrigger>
        </TabsList>
        
        <TabsContent value="terms" className="flex-1 flex flex-col p-0 m-0">
          <ScrollArea className="flex-1 h-[calc(100vh-110px)]">
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4">Termos de Uso</h1>
              <p className="text-neutral-500 mb-6">Última atualização: 01 de Agosto de 2023</p>
              
              <div className="space-y-6 text-neutral-700">
                <section>
                  <h2 className="text-lg font-semibold mb-2">1. Aceitação dos Termos</h2>
                  <p>
                    Ao acessar ou usar o AgendoAI, você concorda em cumprir e estar vinculado por estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com qualquer parte destes termos, você não está autorizado a usar nossos serviços.
                  </p>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">2. Descrição do Serviço</h2>
                  <p>
                    O AgendoAI é uma plataforma que conecta clientes a prestadores de serviços, permitindo o agendamento e gerenciamento de compromissos. Nossos serviços incluem, mas não se limitam a:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Busca e descoberta de prestadores de serviços</li>
                    <li>Agendamento online de serviços</li>
                    <li>Gerenciamento de compromissos para prestadores</li>
                    <li>Avaliações e feedback</li>
                    <li>Processamento de pagamentos (quando aplicável)</li>
                  </ul>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">3. Contas de Usuário</h2>
                  <p>
                    Para utilizar certos recursos da plataforma, você precisa criar uma conta. Você é responsável por manter a confidencialidade de suas credenciais de conta e por todas as atividades que ocorrem sob sua conta. Você concorda em:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Fornecer informações precisas e completas ao criar sua conta</li>
                    <li>Atualizar suas informações conforme necessário</li>
                    <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta</li>
                    <li>Ser o único responsável por todas as atividades realizadas usando sua conta</li>
                  </ul>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">4. Responsabilidades do Usuário</h2>
                  <p>
                    Ao usar nossa plataforma, você concorda em:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Fornecer informações verdadeiras e precisas</li>
                    <li>Cumprir seus compromissos agendados ou cancelá-los dentro do período permitido</li>
                    <li>Não usar a plataforma para fins ilegais ou não autorizados</li>
                    <li>Não violar direitos de propriedade intelectual ou outros direitos legais</li>
                    <li>Não tentar prejudicar, interromper ou explorar vulnerabilidades da plataforma</li>
                  </ul>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">5. Responsabilidades do Prestador de Serviços</h2>
                  <p>
                    Os prestadores de serviços que utilizam nossa plataforma concordam em:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Fornecer serviços de qualidade profissional</li>
                    <li>Cumprir os horários agendados</li>
                    <li>Manter suas informações e disponibilidade atualizadas</li>
                    <li>Cumprir todas as leis e regulamentos aplicáveis à sua atividade</li>
                    <li>Manter licenças e seguros necessários para sua prática profissional</li>
                  </ul>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">6. Pagamentos e Taxas</h2>
                  <p>
                    Os termos de pagamento variam de acordo com o serviço e o prestador. O AgendoAI pode cobrar taxas pelo uso da plataforma, que serão claramente comunicadas antes de qualquer transação.
                  </p>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">7. Cancelamentos e Reembolsos</h2>
                  <p>
                    As políticas de cancelamento são estabelecidas pelos prestadores de serviços e podem variar. Em geral, os cancelamentos devem ser feitos com pelo menos 24 horas de antecedência. Os reembolsos são processados de acordo com a política do prestador e os termos de pagamento aplicáveis.
                  </p>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">8. Limitação de Responsabilidade</h2>
                  <p>
                    O AgendoAI atua como intermediário entre clientes e prestadores de serviços. Não somos responsáveis pela qualidade dos serviços prestados, por cancelamentos, atrasos ou quaisquer disputas que possam surgir entre clientes e prestadores.
                  </p>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">9. Modificações dos Termos</h2>
                  <p>
                    Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação na plataforma. O uso continuado da plataforma após tais alterações constitui aceitação dos novos termos.
                  </p>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">10. Contato</h2>
                  <p>
                    Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco pelo email: termos@agendoai.com
                  </p>
                </section>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="privacy" className="flex-1 flex flex-col p-0 m-0">
          <ScrollArea className="flex-1 h-[calc(100vh-110px)]">
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4">Política de Privacidade</h1>
              <p className="text-neutral-500 mb-6">Última atualização: 01 de Agosto de 2023</p>
              
              <div className="space-y-6 text-neutral-700">
                <section>
                  <h2 className="text-lg font-semibold mb-2">1. Introdução</h2>
                  <p>
                    Esta Política de Privacidade descreve como o AgendoAI coleta, usa, processa e compartilha suas informações pessoais. Nosso compromisso é proteger sua privacidade e garantir a segurança de seus dados pessoais.
                  </p>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">2. Informações que Coletamos</h2>
                  <p>
                    Podemos coletar os seguintes tipos de informações:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>
                      <strong>Informações de cadastro:</strong> Nome, email, telefone, endereço e informações de conta.
                    </li>
                    <li>
                      <strong>Informações de perfil:</strong> Foto, biografia profissional, serviços oferecidos (para prestadores).
                    </li>
                    <li>
                      <strong>Informações de agendamento:</strong> Datas, horários, serviços agendados e histórico de agendamentos.
                    </li>
                    <li>
                      <strong>Informações de pagamento:</strong> Quando aplicável, dados de cartão de crédito ou outros métodos de pagamento.
                    </li>
                    <li>
                      <strong>Informações de uso:</strong> Como você interage com nossa plataforma, preferências e configurações.
                    </li>
                    <li>
                      <strong>Informações de dispositivo:</strong> Tipo de dispositivo, sistema operacional, endereço IP e identificadores de dispositivo.
                    </li>
                  </ul>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">3. Como Usamos Suas Informações</h2>
                  <p>
                    Utilizamos suas informações para:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Fornecer, manter e melhorar nossos serviços</li>
                    <li>Processar agendamentos e pagamentos</li>
                    <li>Comunicar-nos com você sobre agendamentos, promoções e atualizações</li>
                    <li>Personalizar sua experiência na plataforma</li>
                    <li>Detectar e prevenir fraudes e abusos</li>
                    <li>Cumprir obrigações legais</li>
                  </ul>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">4. Compartilhamento de Informações</h2>
                  <p>
                    Podemos compartilhar suas informações com:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>
                      <strong>Prestadores de serviços:</strong> Para facilitar agendamentos (apenas as informações necessárias).
                    </li>
                    <li>
                      <strong>Provedores de serviços:</strong> Empresas que nos ajudam a operar nossa plataforma (processamento de pagamentos, hospedagem, análise de dados).
                    </li>
                    <li>
                      <strong>Parceiros de negócios:</strong> Para oferecer produtos ou serviços integrados.
                    </li>
                    <li>
                      <strong>Autoridades legais:</strong> Quando exigido por lei ou para proteger direitos legais.
                    </li>
                  </ul>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">5. Seus Direitos e Escolhas</h2>
                  <p>
                    Você tem certos direitos sobre suas informações pessoais, incluindo:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Acessar e receber uma cópia de suas informações</li>
                    <li>Corrigir informações incorretas ou incompletas</li>
                    <li>Excluir suas informações (sujeito a certas exceções)</li>
                    <li>Optar por não receber comunicações de marketing</li>
                    <li>Retirar consentimento para certos processamentos de dados</li>
                  </ul>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">6. Segurança de Dados</h2>
                  <p>
                    Implementamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, perda acidental ou alteração. No entanto, nenhum sistema é completamente seguro, e não podemos garantir a segurança absoluta de suas informações.
                  </p>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">7. Retenção de Dados</h2>
                  <p>
                    Mantemos suas informações pessoais pelo tempo necessário para fornecer nossos serviços, cumprir obrigações legais ou resolver disputas. Quando sua conta for encerrada, poderemos reter certas informações para fins legítimos ou desidentificá-las para fins analíticos.
                  </p>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">8. Alterações à Política de Privacidade</h2>
                  <p>
                    Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações significativas por meio de notificação na plataforma ou por email. O uso continuado da plataforma após tais alterações constitui aceitação da nova política.
                  </p>
                </section>
                
                <section>
                  <h2 className="text-lg font-semibold mb-2">9. Contato</h2>
                  <p>
                    Se você tiver dúvidas ou preocupações sobre esta Política de Privacidade ou sobre como tratamos seus dados, entre em contato com nosso Oficial de Proteção de Dados em privacidade@agendoai.com.
                  </p>
                </section>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
