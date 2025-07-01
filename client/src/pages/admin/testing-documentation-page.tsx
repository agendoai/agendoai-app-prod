import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Database, 
  Eye, 
  FileText, 
  RotateCcw, 
  Search, 
  Terminal,
  Loader,
  XCircle,
  Upload,
  Download,
  FileCog
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TestCase {
  id: string;
  description: string;
  steps: string[];
  expected_result: string;
  area: string;
  status: "passed" | "failed" | "pending" | "skipped";
  last_tested: string | null;
  duration?: number;
}

interface SystemLog {
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
  source: string;
  details?: string;
}

export default function TestingDocumentationPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("test-cases");
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  // Carregar logs do sistema
  const fetchSystemLogs = async () => {
    setLoading(true);
    try {
      // Em um ambiente real, esta chamada buscaria logs do servidor
      // const response = await apiRequest("GET", "/api/admin/system-logs");
      // const data = await response.json();
      // setLogs(data);
      
      // Para demonstração, usamos logs simulados
      const mockLogs: SystemLog[] = [
        {
          timestamp: new Date().toISOString(),
          level: "info",
          message: "Sistema iniciado com sucesso",
          source: "server/index.ts"
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
          level: "warning",
          message: "Chaves VAPID não encontradas. Serviço de notificações push não inicializado",
          source: "server/push-notification-service.ts"
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          level: "error",
          message: "Falha ao conectar com serviço de email",
          source: "server/email-service.ts",
          details: "SENDGRID_API_KEY não encontrada. Serviço de email não inicializado"
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          level: "info",
          message: "Novo agendamento criado",
          source: "server/routes/appointments-routes.ts",
          details: "Agendamento #1234 para o cliente ID 1 com o prestador ID 2"
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          level: "info",
          message: "Login bem-sucedido: admin@agendoai.com",
          source: "server/auth.ts"
        }
      ];
      setLogs(mockLogs);
    } catch (error) {
      toast({
        title: "Erro ao carregar logs",
        description: "Não foi possível buscar os logs do sistema.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar casos de teste
  const fetchTestCases = async () => {
    setLoading(true);
    try {
      // Em um ambiente real, esta chamada buscaria testes do servidor
      // const response = await apiRequest("GET", "/api/admin/test-cases");
      // const data = await response.json();
      // setTestCases(data);
      
      // Para demonstração, usamos casos de teste simulados
      const mockTestCases: TestCase[] = [
        {
          id: "TC001",
          description: "Verificar login com credenciais válidas",
          steps: [
            "Acessar a página de login",
            "Inserir email válido",
            "Inserir senha válida",
            "Clicar no botão 'Entrar'"
          ],
          expected_result: "Usuário é redirecionado para o dashboard correspondente ao seu tipo",
          area: "autenticação",
          status: "passed",
          last_tested: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          duration: 2.5
        },
        {
          id: "TC002",
          description: "Verificar fluxo de agendamento completo",
          steps: [
            "Fazer login como cliente",
            "Navegar até a página de niches",
            "Selecionar um nicho",
            "Selecionar uma categoria",
            "Selecionar um serviço",
            "Selecionar um prestador",
            "Escolher data e horário disponíveis",
            "Confirmar detalhes do agendamento",
            "Selecionar método de pagamento",
            "Concluir agendamento"
          ],
          expected_result: "Agendamento criado com sucesso, cliente redirecionado para página de sucesso",
          area: "agendamento",
          status: "passed",
          last_tested: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          duration: 18.3
        },
        {
          id: "TC003",
          description: "Verificar gerenciamento de disponibilidade do prestador",
          steps: [
            "Fazer login como prestador",
            "Acessar página de agenda",
            "Configurar horários disponíveis para cada dia da semana",
            "Salvar alterações",
            "Verificar se as alterações foram aplicadas corretamente"
          ],
          expected_result: "Disponibilidade do prestador atualizada com sucesso",
          area: "prestador",
          status: "pending",
          last_tested: null
        },
        {
          id: "TC004",
          description: "Verificar integração com gateway de pagamento (Stripe)",
          steps: [
            "Iniciar fluxo de agendamento",
            "Selecionar pagamento com cartão",
            "Preencher dados do cartão na interface do Stripe",
            "Submeter pagamento",
            "Verificar confirmação de pagamento"
          ],
          expected_result: "Pagamento processado com sucesso e agendamento confirmado",
          area: "pagamento",
          status: "failed",
          last_tested: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          duration: 8.7
        },
        {
          id: "TC005",
          description: "Verificar notificações em tempo real",
          steps: [
            "Abrir duas sessões distintas (cliente e prestador)",
            "Criar um novo agendamento como cliente",
            "Verificar se o prestador recebe notificação em tempo real"
          ],
          expected_result: "Prestador recebe notificação de novo agendamento sem precisar atualizar a página",
          area: "notificações",
          status: "passed",
          last_tested: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
          duration: 5.2
        },
        {
          id: "TC006",
          description: "Verificar relatórios administrativos",
          steps: [
            "Fazer login como administrador",
            "Acessar página de relatórios",
            "Verificar gráficos e dados estatísticos",
            "Filtrar por período específico",
            "Exportar relatório"
          ],
          expected_result: "Relatórios exibidos corretamente e exportação bem-sucedida",
          area: "admin",
          status: "pending",
          last_tested: null
        }
      ];
      setTestCases(mockTestCases);
    } catch (error) {
      toast({
        title: "Erro ao carregar casos de teste",
        description: "Não foi possível buscar os casos de teste.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (activeTab === "system-logs") {
      fetchSystemLogs();
    } else if (activeTab === "test-cases") {
      fetchTestCases();
    }
  }, [activeTab]);
  
  // Filtrar casos de teste
  const filteredTestCases = testCases.filter(test => {
    const matchesSearch = searchQuery === "" || 
      test.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.id.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesArea = selectedArea === "all" || test.area === selectedArea;
    const matchesStatus = selectedStatus === "all" || test.status === selectedStatus;
    
    return matchesSearch && matchesArea && matchesStatus;
  });
  
  // Áreas únicas para filtro
  const uniqueAreas = ["all", ...Array.from(new Set(testCases.map(test => test.area)))];
  
  // Formatar data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca testado";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Executar caso de teste
  const runTestCase = (testId: string) => {
    toast({
      title: "Teste iniciado",
      description: `Executando teste ${testId}...`,
    });
    
    // Simular execução de teste
    setTimeout(() => {
      setTestCases(prev => prev.map(test => {
        if (test.id === testId) {
          return {
            ...test,
            status: Math.random() > 0.3 ? "passed" : "failed",
            last_tested: new Date().toISOString(),
            duration: parseFloat((Math.random() * 10 + 1).toFixed(1))
          };
        }
        return test;
      }));
      
      toast({
        title: "Teste concluído",
        description: `O teste ${testId} foi concluído.`,
        variant: "default",
      });
    }, 3000);
  };
  
  // Executar todos os testes
  const runAllTests = () => {
    toast({
      title: "Iniciando testes",
      description: "Executando todos os testes...",
    });
    
    // Simular execução de todos os testes
    setTimeout(() => {
      setTestCases(prev => prev.map(test => {
        return {
          ...test,
          status: Math.random() > 0.2 ? "passed" : "failed",
          last_tested: new Date().toISOString(),
          duration: parseFloat((Math.random() * 10 + 1).toFixed(1))
        };
      }));
      
      toast({
        title: "Testes concluídos",
        description: "Todos os testes foram executados.",
        variant: "default",
      });
    }, 5000);
  };
  
  // Limpar logs
  const clearLogs = () => {
    setLogs([]);
    toast({
      title: "Logs limpos",
      description: "Os logs do sistema foram limpos.",
    });
  };
  
  // Exportar logs
  const exportLogs = () => {
    const logsText = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${log.details ? ` - ${log.details}` : ''}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `agendoai-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Logs exportados",
      description: "Os logs do sistema foram exportados com sucesso.",
    });
  };
  
  // Exportar resultados de testes
  const exportTestResults = () => {
    const testsText = testCases.map(test => 
      `ID: ${test.id}\nDescrição: ${test.description}\nStatus: ${test.status}\nÚltimo teste: ${formatDate(test.last_tested)}\nÁrea: ${test.area}\n${test.duration ? `Duração: ${test.duration}s\n` : ''}Passos: ${test.steps.join(', ')}\nResultado esperado: ${test.expected_result}\n`
    ).join('\n---\n\n');
    
    const blob = new Blob([testsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `agendoai-testes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Resultados exportados",
      description: "Os resultados dos testes foram exportados com sucesso.",
    });
  };
  
  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold flex items-center">
            <FileCog className="mr-2 h-8 w-8" /> 
            Documentação e Testes
          </h1>
          <div className="flex gap-2">
            {activeTab === "system-logs" && (
              <>
                <Button variant="outline" onClick={clearLogs} className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" /> Limpar Logs
                </Button>
                <Button variant="outline" onClick={exportLogs} className="flex items-center gap-2">
                  <Download className="h-4 w-4" /> Exportar Logs
                </Button>
              </>
            )}
            {activeTab === "test-cases" && (
              <>
                <Button variant="outline" onClick={runAllTests} className="flex items-center gap-2">
                  <PlayIcon className="h-4 w-4" /> Executar Todos
                </Button>
                <Button variant="outline" onClick={exportTestResults} className="flex items-center gap-2">
                  <Download className="h-4 w-4" /> Exportar Resultados
                </Button>
              </>
            )}
          </div>
        </div>
        
        <Tabs defaultValue="test-cases" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="test-cases" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Casos de Teste
            </TabsTrigger>
            <TabsTrigger value="system-logs" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" /> Logs do Sistema
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Performance
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="test-cases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Casos de Teste</span>
                  <div className="flex gap-2 items-center text-sm font-normal">
                    <span>Total: {testCases.length}</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Passou: {testCases.filter(t => t.status === "passed").length}
                    </Badge>
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                      Falhou: {testCases.filter(t => t.status === "failed").length}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      Pendente: {testCases.filter(t => t.status === "pending").length}
                    </Badge>
                  </div>
                </CardTitle>
                
                <div className="flex flex-wrap gap-4 mt-2">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar casos de teste..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="px-3 py-2 text-sm border rounded-md"
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                    >
                      {uniqueAreas.map((area) => (
                        <option key={area} value={area}>
                          {area === "all" ? "Todas as áreas" : `Área: ${area}`}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      className="px-3 py-2 text-sm border rounded-md"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="all">Todos os status</option>
                      <option value="passed">Passou</option>
                      <option value="failed">Falhou</option>
                      <option value="pending">Pendente</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredTestCases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum caso de teste encontrado com os filtros atuais.
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {filteredTestCases.map((test) => (
                      <AccordionItem key={test.id} value={test.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center">
                              <Badge className="mr-3">{test.id}</Badge>
                              <span className="font-medium">{test.description}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={`
                                ${test.status === "passed" ? "bg-green-100 text-green-800" : ""}
                                ${test.status === "failed" ? "bg-red-100 text-red-800" : ""}
                                ${test.status === "pending" ? "bg-yellow-100 text-yellow-800" : ""}
                                ${test.status === "skipped" ? "bg-gray-100 text-gray-800" : ""}
                              `}>
                                {test.status === "passed" && "Passou"}
                                {test.status === "failed" && "Falhou"}
                                {test.status === "pending" && "Pendente"}
                                {test.status === "skipped" && "Ignorado"}
                              </Badge>
                              {test.duration && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-800">
                                  {test.duration}s
                                </Badge>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        
                        <AccordionContent>
                          <div className="pl-4 pt-2 pb-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium text-sm text-muted-foreground mb-1">Área</h4>
                                <p>{test.area}</p>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm text-muted-foreground mb-1">Último teste</h4>
                                <p className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                                  {formatDate(test.last_tested)}
                                </p>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">Passos</h4>
                              <ol className="list-decimal pl-5 space-y-1">
                                {test.steps.map((step, index) => (
                                  <li key={index}>{step}</li>
                                ))}
                              </ol>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">Resultado esperado</h4>
                              <p>{test.expected_result}</p>
                            </div>
                            
                            {test.status === "failed" && (
                              <Alert variant="destructive" className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Falha no teste</AlertTitle>
                                <AlertDescription>
                                  O teste falhou na última execução. Verifique os detalhes no relatório de execução.
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            <div className="flex justify-end">
                              <Button 
                                onClick={() => runTestCase(test.id)}
                                className="flex items-center gap-2"
                              >
                                <PlayIcon className="h-4 w-4" /> Executar Teste
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="system-logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Logs do Sistema</span>
                  <div className="flex gap-2 items-center text-sm font-normal">
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Info: {logs.filter(log => log.level === "info").length}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      Avisos: {logs.filter(log => log.level === "warning").length}
                    </Badge>
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                      Erros: {logs.filter(log => log.level === "error").length}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Timestamp</TableHead>
                          <TableHead className="w-[100px]">Nível</TableHead>
                          <TableHead className="w-[200px]">Origem</TableHead>
                          <TableHead>Mensagem</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={`
                                ${log.level === "info" ? "bg-blue-100 text-blue-800" : ""}
                                ${log.level === "warning" ? "bg-yellow-100 text-yellow-800" : ""}
                                ${log.level === "error" ? "bg-red-100 text-red-800" : ""}
                              `}>
                                {log.level}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{log.source}</TableCell>
                            <TableCell>
                              {log.message}
                              {log.details && (
                                <Accordion type="single" collapsible className="mt-1">
                                  <AccordionItem value="details">
                                    <AccordionTrigger className="py-1 text-xs text-muted-foreground">
                                      Detalhes
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="text-xs bg-muted p-2 rounded font-mono">
                                        {log.details}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Performance</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Tempo de Carregamento de Página</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <PerformanceCard 
                        title="Página Inicial" 
                        value="1.2s" 
                        change="-15%" 
                        trend="positive" 
                      />
                      <PerformanceCard 
                        title="Dashboard do Cliente" 
                        value="2.5s" 
                        change="0%" 
                        trend="neutral" 
                      />
                      <PerformanceCard 
                        title="Fluxo de Agendamento" 
                        value="3.8s" 
                        change="+12%" 
                        trend="negative" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Uso de Recursos do Servidor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <PerformanceCard 
                        title="CPU" 
                        value="23%" 
                        change="-5%" 
                        trend="positive" 
                      />
                      <PerformanceCard 
                        title="Memória" 
                        value="356 MB" 
                        change="+8%" 
                        trend="negative" 
                      />
                      <PerformanceCard 
                        title="Requisições/min" 
                        value="146" 
                        change="+22%" 
                        trend="neutral" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Tempos de Resposta de API</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Tempo Médio</TableHead>
                          <TableHead>Mínimo</TableHead>
                          <TableHead>Máximo</TableHead>
                          <TableHead>Requisições</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-mono text-xs">/api/appointments</TableCell>
                          <TableCell>86ms</TableCell>
                          <TableCell>64ms</TableCell>
                          <TableCell>412ms</TableCell>
                          <TableCell>1,243</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono text-xs">/api/providers</TableCell>
                          <TableCell>104ms</TableCell>
                          <TableCell>89ms</TableCell>
                          <TableCell>356ms</TableCell>
                          <TableCell>985</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono text-xs">/api/services</TableCell>
                          <TableCell>95ms</TableCell>
                          <TableCell>72ms</TableCell>
                          <TableCell>287ms</TableCell>
                          <TableCell>1,567</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono text-xs">/api/user</TableCell>
                          <TableCell>68ms</TableCell>
                          <TableCell>54ms</TableCell>
                          <TableCell>198ms</TableCell>
                          <TableCell>2,841</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono text-xs">/api/categories</TableCell>
                          <TableCell>76ms</TableCell>
                          <TableCell>68ms</TableCell>
                          <TableCell>231ms</TableCell>
                          <TableCell>1,129</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

interface PerformanceCardProps {
  title: string;
  value: string;
  change: string;
  trend: "positive" | "negative" | "neutral";
}

function PerformanceCard({ title, value, change, trend }: PerformanceCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <div className={`flex items-center mt-1 text-sm ${
        trend === "positive" ? "text-green-600" : 
        trend === "negative" ? "text-red-600" : 
        "text-gray-600"
      }`}>
        {trend === "positive" && <TrendingUpIcon className="h-4 w-4 mr-1" />}
        {trend === "negative" && <TrendingDownIcon className="h-4 w-4 mr-1" />}
        {trend === "neutral" && <BarChart className="h-4 w-4 mr-1" />}
        {change}
      </div>
    </div>
  );
}

// Ícones
function PlayIcon(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function TrendingUpIcon(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function TrendingDownIcon(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

function BarChart(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}

function Activity(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}