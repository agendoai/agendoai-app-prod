import { useState } from "react";
import { useLocation } from "wouter";
import { 
  ChevronDown, 
  ChevronUp, 
  MessageCircle, 
  Phone, 
  Mail,
  Headphones
} from "lucide-react";
import ClientLayout from "@/components/layout/client-layout";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FAQItem = {
  question: string;
  answer: string;
};

export default function HelpPage() {
  const [, setLocation] = useLocation();
  
  const navigateToSupport = () => {
    setLocation("/client/support");
  };
  
  const faqItems: FAQItem[] = [
    {
      question: "O AgendoAI é gratuito?",
      answer: "Sim, o AgendoAI é totalmente gratuito para clientes. Prestadores de serviços têm acesso a funcionalidades básicas gratuitamente, com opção de planos premium para recursos avançados."
    },
    {
      question: "Como posso cancelar um agendamento?",
      answer: "Para cancelar um agendamento, acesse a seção 'Agendamentos' no menu inferior, selecione o agendamento que deseja cancelar e toque no botão 'Cancelar Agendamento'. O cancelamento está sujeito à política de cada prestador de serviço."
    },
    {
      question: "É possível reagendar um serviço?",
      answer: "Sim, para reagendar um serviço, acesse a seção 'Agendamentos', selecione o agendamento desejado e toque em 'Reagendar'. Você poderá escolher uma nova data e horário conforme a disponibilidade do prestador."
    },
    {
      question: "Como funciona o pagamento?",
      answer: "O AgendoAI oferece múltiplas opções de pagamento: cartão de crédito, PIX ou pagamento presencial. Você pode escolher o método mais conveniente durante o processo de agendamento."
    },
    {
      question: "Posso avaliar o prestador de serviço?",
      answer: "Sim, após a conclusão do serviço, você receberá uma notificação para avaliar o prestador. Suas avaliações ajudam a manter a qualidade da plataforma e auxiliam outros clientes."
    },
    {
      question: "Como encontrar prestadores próximos à minha localização?",
      answer: "Na tela inicial, toque em 'Explorar' e utilize os filtros de localização. Você também pode acessar o mapa de prestadores para visualizar serviços disponíveis próximos a você."
    },
    {
      question: "Preciso criar uma conta para agendar serviços?",
      answer: "Sim, é necessário criar uma conta para agendar serviços. O cadastro é rápido e pode ser feito com seu e-mail ou através de redes sociais."
    },
    {
      question: "Como atualizar minhas informações pessoais?",
      answer: "Acesse a seção 'Perfil' no menu inferior e toque em 'Informações Pessoais'. Lá você poderá atualizar seus dados como nome, e-mail, telefone e endereço."
    },
  ];
  
  return (
    <ClientLayout showBackButton title="Ajuda">
      <div className="p-4 space-y-6">
        {/* Seção de FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Perguntas Frequentes</CardTitle>
            <CardDescription>
              Confira as respostas para as dúvidas mais comuns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
        
        {/* Seção de Suporte */}
        <Card>
          <CardHeader>
            <CardTitle>Precisa de mais ajuda?</CardTitle>
            <CardDescription>
              Entre em contato com nossa equipe de suporte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Chat de Suporte</p>
                <p className="text-sm text-muted-foreground">Disponível das 8h às 20h</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Telefone</p>
                <p className="text-sm text-muted-foreground">0800 123 4567</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">E-mail</p>
                <p className="text-sm text-muted-foreground">suporte@agendoai.com</p>
              </div>
            </div>
            
            <Button 
              className="w-full mt-4" 
              onClick={navigateToSupport}
            >
              <Headphones className="mr-2 h-4 w-4" />
              Contatar Suporte
            </Button>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}