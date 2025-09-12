import React from "react";
import ProviderLayout from "@/components/layout/provider-layout";
import AppHeader from "@/components/layout/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Mail, Clock, Users, Shield, Zap } from "lucide-react";

export default function ProviderSupportPage() {
  return (
    <ProviderLayout title="Ajuda e Suporte">
      <div className="min-h-screen w-full bg-white relative overflow-hidden">
        {/* Professional Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Subtle Gradient Overlays */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#58c9d1]/8 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#58c9d1]/6 to-transparent rounded-full blur-3xl"></div>
          
          {/* Professional Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(88,201,209,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(88,201,209,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40"></div>
        </div>
        
        <div className="relative z-10">
          <AppHeader title="Ajuda e Suporte" showBackButton showUserInfo={false} />
          
          <div className="p-4 md:p-6 lg:p-8 xl:p-12 space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12 w-full">
            {/* Header Section */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] shadow-xl shadow-[#58c9d1]/30 mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] bg-clip-text text-transparent">
                Central de Ajuda e Suporte
              </h1>
              <p className="text-neutral-600 text-sm md:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
                Nossa equipe especializada está sempre pronta para ajudar você. 
                Escolha a melhor forma de entrar em contato conosco.
              </p>
            </div>

            {/* Contact Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* WhatsApp Support */}
              <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500 transform hover:scale-[1.02]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-neutral-900">WhatsApp</CardTitle>
                      <CardDescription className="text-neutral-600">Atendimento imediato</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-sm text-neutral-600">
                      <Clock className="h-4 w-4 text-[#58c9d1]" />
                      <span>Seg-Sex: 8h às 18h</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-neutral-600">
                      <Phone className="h-4 w-4 text-[#58c9d1]" />
                      <span>(11) 97466-8605</span>
                    </div>
                    <Button 
                      onClick={() => window.open('https://wa.me/5511974668605?text=Olá! Preciso de ajuda com a plataforma AgendoAI.', '_blank')}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 rounded-xl"
                      size="lg"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Abrir WhatsApp</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Email Support */}
              <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500 transform hover:scale-[1.02]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] rounded-xl shadow-lg">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-neutral-900">E-mail</CardTitle>
                      <CardDescription className="text-neutral-600">Suporte via e-mail</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-sm text-neutral-600">
                      <Clock className="h-4 w-4 text-[#58c9d1]" />
                      <span>Resposta em até 24h</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-neutral-600">
                      <Mail className="h-4 w-4 text-[#58c9d1]" />
                      <span className="break-all">suporte@agendoai.com</span>
                    </div>
                    <Button 
                      onClick={() => window.open('mailto:suporte@agendoai.com?subject=Suporte AgendoAI - Prestador&body=Olá, preciso de ajuda com:', '_blank')}
                      className="w-full bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] hover:from-[#4aadb5] hover:to-[#58c9d1] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 rounded-xl"
                      size="lg"
                    >
                      <Mail className="h-5 w-5 mr-2" />
                      <span className="font-medium">Enviar E-mail</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Help Section */}
            <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl md:text-2xl flex items-center justify-center bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] bg-clip-text text-transparent font-medium">
                  <div className="p-2 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] rounded-lg mr-3 shadow-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  Como podemos ajudar?
                </CardTitle>
                <CardDescription className="text-base text-neutral-600 max-w-3xl mx-auto leading-relaxed">
                  Nossa equipe está preparada para resolver qualquer questão relacionada à plataforma, 
                  desde problemas técnicos até dúvidas sobre funcionalidades.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center space-y-3 p-4 rounded-xl bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 border border-[#58c9d1]/20">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-medium text-neutral-900">Problemas Técnicos</h4>
                    <p className="text-sm text-neutral-600">Dificuldades com login, agendamentos ou funcionalidades</p>
                  </div>
                  
                  <div className="text-center space-y-3 p-4 rounded-xl bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 border border-[#58c9d1]/20">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-medium text-neutral-900">Gestão de Clientes</h4>
                    <p className="text-sm text-neutral-600">Dúvidas sobre agendamentos e atendimento aos clientes</p>
                  </div>
                  
                  <div className="text-center space-y-3 p-4 rounded-xl bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 border border-[#58c9d1]/20">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-medium text-neutral-900">Conta e Segurança</h4>
                    <p className="text-sm text-neutral-600">Alteração de dados, senhas e configurações de segurança</p>
                  </div>
                  
                  <div className="text-center space-y-3 p-4 rounded-xl bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 border border-[#58c9d1]/20">
                    <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-medium text-neutral-900">Melhorias</h4>
                    <p className="text-sm text-neutral-600">Sugestões de funcionalidades e melhorias na plataforma</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}