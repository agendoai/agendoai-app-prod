
import React from "react";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Book, Code, Database, FileText, Info, Lock, Package, Server, ShieldCheck, Users } from "lucide-react";

export default function DocumentationPage() {
  return (
    <AdminLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <Book className="mr-2 h-8 w-8" /> 
          Documentação do Sistema
        </h1>

        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="flex items-center">
              <Info className="mr-2 h-4 w-4" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="mr-2 h-4 w-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Lock className="mr-2 h-4 w-4" /> Segurança
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center">
              <Database className="mr-2 h-4 w-4" /> Banco de Dados
            </TabsTrigger>
            <TabsTrigger value="apis" className="flex items-center">
              <Code className="mr-2 h-4 w-4" /> APIs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral do Sistema</CardTitle>
                <CardDescription>Funcionalidades principais e arquitetura</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Principais Recursos</h3>
                    <ul className="list-disc list-inside space-y-2">
                      <li>Gestão de usuários (clientes, prestadores, admins)</li>
                      <li>Sistema de agendamentos em tempo real</li>
                      <li>Integração com Stripe para pagamentos</li>
                      <li>Sistema de avaliações e feedback</li>
                      <li>Notificações via WhatsApp e email</li>
                      <li>Dashboard com métricas e relatórios</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Tecnologias</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Frontend</h4>
                        <ul className="text-sm space-y-1">
                          <li>React + TypeScript</li>
                          <li>TailwindCSS</li>
                          <li>Shadcn/ui</li>
                          <li>TanStack Query</li>
                        </ul>
                      </Card>

                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Backend</h4>
                        <ul className="text-sm space-y-1">
                          <li>Node.js + Express</li>
                          <li>WebSocket</li>
                          <li>PostgreSQL</li>
                          <li>Drizzle ORM</li>
                        </ul>
                      </Card>

                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Integrações</h4>
                        <ul className="text-sm space-y-1">
                          <li>Stripe</li>
                          <li>WhatsApp API</li>
                          <li>SendGrid</li>
                          <li>Push Notifications</li>
                        </ul>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Usuários</CardTitle>
                <CardDescription>Tipos de usuário e suas permissões</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead>Restrições</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Cliente</TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside text-sm">
                          <li>Agendar serviços</li>
                          <li>Avaliar prestadores</li>
                          <li>Gerenciar perfil</li>
                        </ul>
                      </TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside text-sm">
                          <li>Sem acesso administrativo</li>
                          <li>Não edita outros perfis</li>
                        </ul>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Prestador</TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside text-sm">
                          <li>Gerenciar serviços</li>
                          <li>Configurar agenda</li>
                          <li>Ver histórico</li>
                        </ul>
                      </TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside text-sm">
                          <li>Acesso limitado ao painel</li>
                          <li>Não edita outros prestadores</li>
                        </ul>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Admin</TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside text-sm">
                          <li>Acesso total ao sistema</li>
                          <li>Gerencia usuários</li>
                          <li>Configura plataforma</li>
                        </ul>
                      </TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside text-sm">
                          <li>Não exclui último admin</li>
                          <li>Não acessa senhas</li>
                        </ul>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>Medidas de segurança implementadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Autenticação</h3>
                    <ul className="list-disc list-inside space-y-2">
                      <li>Criptografia de senhas com scrypt</li>
                      <li>Sessões seguras com express-session</li>
                      <li>Verificação de email</li>
                      <li>Proteção CSRF</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Logs de Autenticação</h3>
                    <div className="bg-muted p-4 rounded-md mb-4">
                      <pre className="text-xs">
{`// Exemplo de log para auditoria no middleware de admin/suporte
Usuário ${"{id}"} (${"{userType}"}) acessando rota de admin: ${"{path}"}`}
                      </pre>
                    </div>
                    <p className="text-sm mb-2">Os logs de autenticação registram todos os acessos a rotas protegidas, permitindo auditoria de segurança completa.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Permissões Cruzadas</h3>
                    <div className="bg-muted p-4 rounded-md mb-4">
                      <ul className="list-disc list-inside text-sm">
                        <li><strong>Admin:</strong> Acesso total a todas as funcionalidades administrativas e de suporte</li>
                        <li><strong>Suporte:</strong> Acesso a funcionalidades de suporte e acesso limitado a funções administrativas</li>
                      </ul>
                    </div>
                    <p className="text-sm">Os middlewares de autenticação <code>isAdmin</code> e <code>isSupport</code> estão configurados para permitir acesso bidirecional entre esses tipos de usuário, mantendo logs para auditoria.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Dados Sensíveis</h3>
                    <ul className="list-disc list-inside space-y-2">
                      <li>Dados de pagamento não armazenados</li>
                      <li>HTTPS em produção</li>
                      <li>Validação com Zod</li>
                      <li>Logs de auditoria</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle>Estrutura do Banco</CardTitle>
                <CardDescription>Principais tabelas e relacionamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="users">
                    <AccordionTrigger>Usuários</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-4 rounded-md">
                        <pre className="text-xs">
{`{
  id: number (PK),
  email: string (unique),
  name: string,
  userType: "client" | "provider" | "admin" | "support",
  isActive: boolean,
  isVerified: boolean
}`}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="services">
                    <AccordionTrigger>Serviços Atuais</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-4 rounded-md mb-2">
                        <pre className="text-xs">
{`// services_templates (gerenciado por admin)
{
  id: number (PK),
  categoryId: number (FK),
  name: string,
  description: string,
  price: number (sugerido),
  duration: number (sugerido)
}`}
                        </pre>
                      </div>
                      <div className="bg-muted p-4 rounded-md">
                        <pre className="text-xs">
{`// provider_services (personalizados pelo prestador)
{
  id: number (PK),
  providerId: number (FK),
  serviceId: number (FK para template),
  price: number,
  execution_time: number,
  break_time: number
}`}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="new-services">
                    <AccordionTrigger className="text-primary font-medium">Nova Estrutura Proposta</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-3">Nova estrutura de serviços que separa claramente:</p>
                      <div className="bg-muted p-4 rounded-md mb-2">
                        <pre className="text-xs">
{`// base_services (gerenciado por admin)
{
  id: number (PK),
  categoryId: number (FK),
  name: string,
  description: string,
  suggestedPrice: number (opcional),
  suggestedDuration: number,
  isActive: boolean
}`}
                        </pre>
                      </div>
                      <div className="bg-muted p-4 rounded-md">
                        <pre className="text-xs">
{`// provider_portfolio (personalizado pelo prestador)
{
  id: number (PK),
  providerId: number (FK),
  baseServiceId: number (FK),
  price: number,
  duration: number,
  description: string (opcional),
  breakTime: number,
  isActive: boolean
}`}
                        </pre>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm">O plano de migração completo está em <code>migration-plan.sql</code></p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="appointments">
                    <AccordionTrigger>Agendamentos</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-4 rounded-md">
                        <pre className="text-xs">
{`{
  id: number (PK),
  clientId: number (FK),
  providerId: number (FK),
  serviceId: number (FK),
  date: Date,
  startTime: string,
  endTime: string,
  status: string,
  paymentStatus: string,
  paymentMethod: string
}`}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apis">
            <Card>
              <CardHeader>
                <CardTitle>Integrações</CardTitle>
                <CardDescription>APIs externas integradas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">Stripe</h3>
                    <Badge className="mb-2">Pagamentos</Badge>
                    <ul className="text-sm space-y-1">
                      <li>Processamento de pagamentos</li>
                      <li>Split payments</li>
                      <li>Webhooks</li>
                    </ul>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-medium mb-2">WhatsApp</h3>
                    <Badge className="mb-2">Comunicação</Badge>
                    <ul className="text-sm space-y-1">
                      <li>Notificações</li>
                      <li>Chat direto</li>
                      <li>Confirmações</li>
                    </ul>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-medium mb-2">SendGrid</h3>
                    <Badge className="mb-2">Email</Badge>
                    <ul className="text-sm space-y-1">
                      <li>Verificação de email</li>
                      <li>Notificações</li>
                      <li>Marketing</li>
                    </ul>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-medium mb-2">Push</h3>
                    <Badge className="mb-2">Notificações</Badge>
                    <ul className="text-sm space-y-1">
                      <li>Notificações em tempo real</li>
                      <li>Service Worker</li>
                      <li>Offline support</li>
                    </ul>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
