import { useState } from "react";
import { useLocation } from "wouter";
import AppHeader from "@/components/layout/app-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// FAQ Questions and Answers
const faqItems = [
  {
    id: "1",
    question: "Como funciona o AgendoAI?",
    answer: "O AgendoAI é uma plataforma que conecta clientes a prestadores de serviços. Os clientes podem buscar, comparar e agendar serviços diretamente pelo aplicativo, enquanto os prestadores podem gerenciar sua agenda, clientes e receber novos agendamentos.",
    category: "geral"
  },
  {
    id: "2",
    question: "Como criar uma conta?",
    answer: "Para criar uma conta, toque em 'Criar conta' na tela inicial, preencha seu email, defina uma senha e escolha se você deseja se cadastrar como cliente ou prestador de serviços. Em seguida, complete seu perfil com as informações necessárias.",
    category: "conta"
  },
  {
    id: "3",
    question: "Posso cancelar um agendamento?",
    answer: "Sim, você pode cancelar um agendamento até 24 horas antes do horário marcado. Para isso, acesse seu perfil, vá em 'Meus Agendamentos', selecione o agendamento que deseja cancelar e toque em 'Cancelar Agendamento'.",
    category: "agendamentos"
  },
  {
    id: "4",
    question: "Como funciona o pagamento?",
    answer: "Oferecemos diferentes formas de pagamento: você pode pagar diretamente no local ao prestador, ou utilizar cartão de crédito ou PIX através do aplicativo, dependendo das opções disponibilizadas pelo prestador de serviços.",
    category: "pagamentos"
  },
  {
    id: "5",
    question: "Os prestadores são verificados?",
    answer: "Sim, todos os prestadores passam por um processo de verificação básica. Além disso, você pode conferir as avaliações de outros clientes antes de agendar um serviço.",
    category: "prestadores"
  },
  {
    id: "6",
    question: "Como alterar minha senha?",
    answer: "Para alterar sua senha, acesse seu perfil, toque em 'Configurações', selecione 'Segurança' e depois 'Alterar Senha'. Você precisará informar sua senha atual e a nova senha desejada.",
    category: "conta"
  },
  {
    id: "7",
    question: "O que fazer se um prestador não comparecer?",
    answer: "Se um prestador não comparecer ao agendamento, entre em contato com nosso suporte imediatamente. Você poderá solicitar um reagendamento ou reembolso, caso tenha feito pagamento antecipado.",
    category: "agendamentos"
  },
  {
    id: "8",
    question: "Como me tornar um prestador de serviços?",
    answer: "Para se tornar um prestador, crie uma conta como 'Prestador', complete seu perfil com informações profissionais, adicione os serviços que você oferece e configure sua disponibilidade de agenda.",
    category: "prestadores"
  },
  {
    id: "9",
    question: "Posso reagendar um serviço?",
    answer: "Sim, você pode reagendar um serviço até 24 horas antes do horário marcado, sujeito à disponibilidade do prestador. Acesse 'Meus Agendamentos', selecione o agendamento desejado e toque em 'Reagendar'.",
    category: "agendamentos"
  },
  {
    id: "10",
    question: "Como entrar em contato com o suporte?",
    answer: "Para entrar em contato com o suporte, acesse seu perfil, vá em 'Suporte' e selecione a opção 'Contatar Suporte'. Você também pode enviar um email para suporte@agendoai.com.",
    category: "geral"
  }
];

// Categories for filtering
const categories = [
  { id: "all", name: "Todos" },
  { id: "geral", name: "Geral" },
  { id: "conta", name: "Conta" },
  { id: "agendamentos", name: "Agendamentos" },
  { id: "pagamentos", name: "Pagamentos" },
  { id: "prestadores", name: "Prestadores" }
];

export default function FAQPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Filter FAQ items based on search and category
  const filteredFAQs = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  return (
    <div className="min-h-screen bg-white">
      <AppHeader title="Perguntas Frequentes" showBackButton />
      
      <div className="p-4">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Input
            type="text"
            placeholder="Buscar perguntas"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
        </div>
        
        {/* Category Filter */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-2 pb-2">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
        
        {/* FAQ Items */}
        {filteredFAQs.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {filteredFAQs.map(item => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-8">
            <p className="text-neutral-500">Nenhuma pergunta encontrada com os filtros atuais.</p>
            <Button 
              variant="link" 
              className="mt-2" 
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
        
        {/* Contact Support */}
        <div className="mt-8 p-4 bg-primary/5 rounded-lg text-center">
          <h3 className="font-bold text-primary mb-2">Não encontrou o que procurava?</h3>
          <p className="text-sm text-neutral-600 mb-4">
            Entre em contato com nossa equipe de suporte e responderemos o mais rápido possível.
          </p>
          <Button variant="outline" className="border-primary text-primary">
            Contatar Suporte
          </Button>
        </div>
      </div>
    </div>
  );
}
