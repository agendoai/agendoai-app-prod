import React from "react";
import ProviderLayout from "@/components/layout/provider-layout";
import { AlertCircle, BookOpen, HelpCircle, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ProviderHelpPage() {
  const faqs = [
    {
      question: "Como alterar meus horários de disponibilidade?",
      answer: "Você pode alterar seus horários de disponibilidade acessando a página 'Minha Agenda', clicando no botão 'Gerenciar Disponibilidade' e configurando os dias e horários que você deseja atender."
    },
    {
      question: "Como cancelar um agendamento?",
      answer: "Para cancelar um agendamento, acesse a página 'Minha Agenda', encontre o agendamento que deseja cancelar, clique nele e selecione a opção 'Cancelar Agendamento'. Lembre-se que o cancelamento pode estar sujeito a políticas específicas conforme seus termos cadastrados."
    },
    {
      question: "Como adicionar um novo serviço?",
      answer: "Para adicionar um novo serviço, acesse a seção 'Meus Serviços' na página inicial, clique em 'Adicionar Serviço' e preencha todas as informações necessárias como nome, descrição, duração e preço."
    },
    {
      question: "O que fazer se um cliente não comparecer?",
      answer: "Se um cliente não comparecer, você pode marcar o agendamento como 'No-show' na sua agenda. Isso manterá um registro para fins estatísticos e permitirá que você aplique possíveis políticas de cancelamento."
    },
    {
      question: "Como receber pagamentos pelo aplicativo?",
      answer: "Para receber pagamentos, você precisa configurar suas informações bancárias na seção 'Configurações' > 'Pagamentos'. Após a configuração, os valores serão transferidos automaticamente conforme a política de pagamentos da plataforma."
    }
  ];

  return (
    <ProviderLayout title="Ajuda">
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Central de Ajuda</h1>
        <p className="text-muted-foreground">
          Encontre respostas para dúvidas comuns sobre a plataforma e aprenda a usar todos os recursos disponíveis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="bg-muted/30">
              <BookOpen className="h-5 w-5 text-primary mb-2" />
              <CardTitle>Guias e Tutoriais</CardTitle>
              <CardDescription>
                Aprenda a usar todas as funcionalidades da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                <li>
                  <Link href="/provider/tutorials/getting-started">
                    <a className="flex items-center text-primary hover:underline">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      <span>Primeiros passos com o AgendoAI</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/provider/tutorials/calendar">
                    <a className="flex items-center text-primary hover:underline">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      <span>Gerenciando sua agenda</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/provider/tutorials/services">
                    <a className="flex items-center text-primary hover:underline">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      <span>Configurando seus serviços</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/provider/tutorials/payments">
                    <a className="flex items-center text-primary hover:underline">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      <span>Recebendo pagamentos</span>
                    </a>
                  </Link>
                </li>
              </ul>

              <Button variant="outline" className="mt-6 w-full">
                Ver todos os tutoriais
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/30">
              <AlertCircle className="h-5 w-5 text-primary mb-2" />
              <CardTitle>Precisa de ajuda?</CardTitle>
              <CardDescription>
                Entre em contato com nossa equipe de suporte
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="mb-4">
                Nossa equipe de suporte está disponível para ajudar em qualquer problema que você encontrar na plataforma.
              </p>

              <Link href="/provider/support">
                <Button className="w-full">
                  Contatar Suporte
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Perguntas Frequentes</h2>
          
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProviderLayout>
  );
}