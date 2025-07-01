import AdminLayout from "@/components/layout/admin-layout";

export default function ProjectDocumentation() {
  return (
    <AdminLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6 text-primary">AgendoAI - Documentação do Projeto</h1>
          
          <div className="prose max-w-none">
            <h2 className="text-2xl font-semibold text-gray-800 mt-8">Estrutura do Projeto</h2>
            <p>O AgendoAI é uma plataforma de agendamento de serviços com três fluxos de usuário distintos:</p>
            
            <ul className="list-disc ml-6 mt-4">
              <li className="mb-2"><strong>Fluxo do Cliente:</strong> Permite que clientes naveguem por categorias de serviços, encontrem prestadores disponíveis, agendem serviços e gerenciem seus compromissos.</li>
              <li className="mb-2"><strong>Fluxo do Prestador:</strong> Permite que prestadores de serviços gerenciem seus perfis, configurem serviços, gerenciem disponibilidade e visualizem agendamentos.</li>
              <li className="mb-2"><strong>Fluxo do Administrador:</strong> Permite gerenciar a plataforma, incluindo categorias, usuários, visualização de relatórios e configurações do sistema.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-800 mt-8">Estrutura do Banco de Dados</h2>
            <p>O sistema utiliza PostgreSQL com o ORM Drizzle para gerenciar o banco de dados. As principais tabelas incluem:</p>
            
            <ul className="list-disc ml-6 mt-4">
              <li className="mb-2"><strong>users:</strong> Armazena informações de todos os usuários (clientes, prestadores e administradores).</li>
              <li className="mb-2"><strong>categories:</strong> Armazena as categorias e nichos de serviços, com estrutura hierárquica.</li>
              <li className="mb-2"><strong>services:</strong> Armazena os serviços oferecidos pelos prestadores.</li>
              <li className="mb-2"><strong>availability:</strong> Armazena a disponibilidade dos prestadores.</li>
              <li className="mb-2"><strong>appointments:</strong> Armazena os agendamentos realizados.</li>
              <li className="mb-2"><strong>provider_settings:</strong> Armazena configurações específicas dos prestadores.</li>
              <li className="mb-2"><strong>payment_settings:</strong> Armazena configurações de pagamento da plataforma.</li>
              <li className="mb-2"><strong>support_messages:</strong> Armazena mensagens de suporte dos usuários.</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6">Relacionamentos principais:</h3>
            
            <ul className="list-disc ml-6 mt-4">
              <li className="mb-2">Cada categoria pode ter um <code>parentId</code> que a conecta a um nicho.</li>
              <li className="mb-2">Cada serviço está associado a uma categoria e a um prestador.</li>
              <li className="mb-2">Cada agendamento conecta um cliente, um prestador e um serviço.</li>
              <li className="mb-2">Cada prestador possui configurações específicas em <code>provider_settings</code>.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-800 mt-8">Fluxos do Sistema</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6">Fluxo do Cliente:</h3>
            <ol className="list-decimal ml-6 mt-4">
              <li className="mb-2">Registro e login (autenticação).</li>
              <li className="mb-2">Navegação por categorias e serviços.</li>
              <li className="mb-2">Seleção de prestador de serviços.</li>
              <li className="mb-2">Seleção de data e horário disponíveis.</li>
              <li className="mb-2">Confirmação e pagamento do agendamento.</li>
              <li className="mb-2">Gerenciamento de agendamentos (visualização, cancelamento).</li>
              <li className="mb-2">Avaliação do serviço após conclusão.</li>
            </ol>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6">Fluxo do Prestador:</h3>
            <ol className="list-decimal ml-6 mt-4">
              <li className="mb-2">Registro e login (autenticação).</li>
              <li className="mb-2">Configuração de perfil profissional.</li>
              <li className="mb-2">Configuração de serviços e preços.</li>
              <li className="mb-2">Definição de disponibilidade na agenda.</li>
              <li className="mb-2">Ativação/desativação do status online.</li>
              <li className="mb-2">Visualização e gestão de agendamentos.</li>
              <li className="mb-2">Criação manual de agendamentos.</li>
              <li className="mb-2">Aplicação de descontos personalizados no momento da reserva.</li>
              <li className="mb-2">Visualização de estatísticas e ganhos.</li>
            </ol>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6">Fluxo do Administrador:</h3>
            <ol className="list-decimal ml-6 mt-4">
              <li className="mb-2">Login administrativo.</li>
              <li className="mb-2">Gerenciamento da hierarquia de categorias (nichos e categorias).</li>
              <li className="mb-2">Visualização e gestão de usuários.</li>
              <li className="mb-2">Configuração de taxas de serviço.</li>
              <li className="mb-2">Visualização de relatórios e métricas.</li>
              <li className="mb-2">Atendimento de tickets de suporte.</li>
            </ol>
            
            <h2 className="text-2xl font-semibold text-gray-800 mt-8">Integrações</h2>
            
            <ul className="list-disc ml-6 mt-4">
              <li className="mb-2"><strong>Stripe:</strong> Processamento de pagamentos online.</li>
              <li className="mb-2"><strong>WhatsApp:</strong> Comunicação direta com prestadores através de links de WhatsApp.</li>
              <li className="mb-2"><strong>SendGrid:</strong> Envio de emails para notificações e verificações.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-800 mt-8">Funcionalidade de Desconto</h2>
            
            <p className="mt-4">
              O sistema permite que prestadores apliquem descontos personalizados durante o processo de agendamento:
            </p>
            
            <ul className="list-disc ml-6 mt-4">
              <li className="mb-2"><strong>Aplicação de Desconto:</strong> Disponível apenas para prestadores durante a criação/confirmação de agendamentos.</li>
              <li className="mb-2"><strong>Percentual de Desconto:</strong> Configurável de 0% a 100% através de um controle deslizante intuitivo.</li>
              <li className="mb-2"><strong>Cálculo de Preço:</strong> O desconto é aplicado sobre o valor do serviço antes da adição da taxa da plataforma.</li>
              <li className="mb-2"><strong>Rastreamento:</strong> O sistema armazena o preço original, o percentual de desconto e o valor do desconto para fins de relatório.</li>
            </ul>
            
            <p className="mt-4">
              <strong>Fluxo de Aplicação de Desconto:</strong>
            </p>
            
            <ol className="list-decimal ml-6 mt-2">
              <li className="mb-2">Ao confirmar um agendamento, o prestador pode ativar a opção "Aplicar desconto".</li>
              <li className="mb-2">O prestador seleciona o percentual de desconto desejado através do controle deslizante.</li>
              <li className="mb-2">O sistema exibe em tempo real o valor com desconto aplicado.</li>
              <li className="mb-2">Ao finalizar o agendamento, as informações de desconto são armazenadas no banco de dados.</li>
            </ol>
            
            <p className="mt-4">
              <strong>Considerações Técnicas:</strong>
            </p>
            
            <ul className="list-disc ml-6 mt-2">
              <li className="mb-2">Os campos <code>discount</code> (percentual), <code>originalPrice</code> (preço original em centavos) e <code>discountAmount</code> (valor do desconto em centavos) são armazenados na tabela de agendamentos.</li>
              <li className="mb-2">A interface de usuário para aplicação de desconto é visível apenas para usuários do tipo "provider".</li>
              <li className="mb-2">Validações são aplicadas no backend para garantir que o desconto esteja entre 0% e 100%.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8">Configurações do Sistema</h2>
            
            <ul className="list-disc ml-6 mt-4">
              <li className="mb-2"><strong>Taxa de Serviço:</strong> R$ 1,75 (valor fixo) por transação.</li>
              <li className="mb-2"><strong>Duração Padrão de Serviços:</strong> 60 minutos.</li>
              <li className="mb-2"><strong>Intervalo de Agendamento:</strong> Blocos de 30 minutos.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-800 mt-8">Suporte Técnico e Administrativo</h2>
            
            <p className="mt-4">
              O sistema inclui uma interface de suporte para administradores que permite:
            </p>
            
            <ul className="list-disc ml-6 mt-4">
              <li className="mb-2">Visualizar e responder mensagens de suporte dos usuários.</li>
              <li className="mb-2">Verificar histórico de interações com os usuários.</li>
              <li className="mb-2">Acompanhar problemas e resoluções.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-800 mt-8">Tecnologias Utilizadas</h2>
            
            <ul className="list-disc ml-6 mt-4">
              <li className="mb-2"><strong>Frontend:</strong> React, TypeScript, Tailwind CSS, shadcn/ui</li>
              <li className="mb-2"><strong>Backend:</strong> Node.js, Express</li>
              <li className="mb-2"><strong>Banco de Dados:</strong> PostgreSQL, Drizzle ORM</li>
              <li className="mb-2"><strong>Autenticação:</strong> Passport.js, express-session</li>
              <li className="mb-2"><strong>Processamento de Pagamentos:</strong> Stripe</li>
              <li className="mb-2"><strong>WebSockets:</strong> Para comunicação em tempo real</li>
              <li className="mb-2"><strong>Email:</strong> SendGrid</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-800 mt-8">Usuários de Teste</h2>
            
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2">Tipo</th>
                    <th className="border px-4 py-2">Email</th>
                    <th className="border px-4 py-2">Senha</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border px-4 py-2">Cliente</td>
                    <td className="border px-4 py-2">cliente@agendoai.com</td>
                    <td className="border px-4 py-2">cliente123</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2">Prestador</td>
                    <td className="border px-4 py-2">prestador@agendoai.com</td>
                    <td className="border px-4 py-2">prestador123</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2">Administrador</td>
                    <td className="border px-4 py-2">admin@agendoai.com</td>
                    <td className="border px-4 py-2">admin123</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2">Admin de Suporte</td>
                    <td className="border px-4 py-2">suporte@agendoai.com</td>
                    <td className="border px-4 py-2">suporte123</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p className="mt-8 italic text-gray-600">Documentação atualizada em 03/05/2025. Esta documentação serve como referência para desenvolvedores e administradores do sistema AgendoAI.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}