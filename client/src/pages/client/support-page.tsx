import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Send, MessageCircle, PhoneCall, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SupportPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    subject: "",
    message: ""
  });
  
  // Carregar mensagens anteriores de suporte
  const { data: previousMessages = [] } = useQuery({
    queryKey: ['/api/support/messages'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/support/messages');
      if (!res.ok) throw new Error('Falha ao carregar mensagens de suporte');
      return res.json();
    },
    enabled: !!user
  });
  
  // Mutação para enviar mensagem de suporte
  const sendMessageMutation = useMutation({
    mutationFn: async (supportData: { subject: string; message: string }) => {
      const res = await apiRequest('POST', '/api/support/send', supportData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Falha ao enviar mensagem');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso. Entraremos em contato em breve."
      });
      
      setFormData({
        subject: "",
        message: ""
      });
      
      // Recarregar mensagens de suporte
      queryClient.invalidateQueries({ queryKey: ['/api/support/messages'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação simples
    if (!formData.subject.trim()) {
      toast({
        title: "Assunto necessário",
        description: "Por favor, informe o assunto da sua mensagem.",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.message.trim()) {
      toast({
        title: "Mensagem necessária",
        description: "Por favor, escreva sua mensagem de suporte.",
        variant: "destructive"
      });
      return;
    }
    
    // Enviar mensagem via mutation
    sendMessageMutation.mutate({
      subject: formData.subject,
      message: formData.message
    });
  };
  
  const goBack = () => {
    setLocation("/client/profile");
  };
  
  const openWhatsApp = () => {
    // Número fictício de suporte
    const supportPhone = "5511999999999";
    const message = "Olá! Preciso de ajuda com o AgendoAI.";
    const whatsappLink = generateWhatsAppLink(supportPhone, message);
    window.open(whatsappLink, "_blank");
  };
  
  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center">
        <button onClick={goBack} className="mr-2">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">Suporte</h1>
      </div>
      
      <div className="p-4">
        <p className="text-neutral-600 mb-6">
          Entre em contato com nossa equipe de suporte para tirar dúvidas ou resolver problemas.
        </p>
        
        {/* Opções de contato */}
        <div className="space-y-4 mb-6">
          <Card className="border border-neutral-200">
            <CardContent className="p-4">
              <button
                onClick={openWhatsApp}
                className="w-full flex items-center text-left"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-sm text-neutral-500">
                    Converse com um atendente via WhatsApp
                  </p>
                </div>
              </button>
            </CardContent>
          </Card>
          
          <Card className="border border-neutral-200">
            <CardContent className="p-4">
              <a
                href="tel:+551140028922"
                className="w-full flex items-center text-left"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <PhoneCall className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Telefone</p>
                  <p className="text-sm text-neutral-500">
                    (11) 4002-8922
                  </p>
                </div>
              </a>
            </CardContent>
          </Card>
          
          <Card className="border border-neutral-200">
            <CardContent className="p-4">
              <a
                href="mailto:suporte@agendoai.com"
                className="w-full flex items-center text-left"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-neutral-500">
                    suporte@agendoai.com
                  </p>
                </div>
              </a>
            </CardContent>
          </Card>
        </div>
        
        {/* Mensagens anteriores (se houver) */}
        {previousMessages.length > 0 && (
          <div className="mt-8 mb-8">
            <h2 className="text-lg font-medium mb-4">Suas mensagens anteriores</h2>
            <div className="space-y-4">
              {previousMessages.map((msg: any) => (
                <Card key={msg.id} className="border border-neutral-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{msg.subject}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        msg.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        msg.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {msg.status === 'pending' ? 'Pendente' : 
                         msg.status === 'in-progress' ? 'Em análise' : 
                         'Resolvido'}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700 mb-2">{msg.message}</p>
                    <p className="text-xs text-neutral-500">
                      Enviado em {new Date(msg.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    
                    {msg.response && (
                      <div className="mt-3 pt-3 border-t border-neutral-200">
                        <p className="text-sm font-medium text-neutral-800">Resposta:</p>
                        <p className="text-sm text-neutral-700">{msg.response}</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          Respondido em {msg.resolvedAt ? new Date(msg.resolvedAt).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {/* Formulário de contato */}
        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4">Enviar nova mensagem</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Ex: Problema no agendamento"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Descreva em detalhes o seu problema ou dúvida..."
                rows={5}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar mensagem
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}