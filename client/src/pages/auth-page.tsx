import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Users, Calendar, CheckCircle, Mail, Lock, User, IdCard } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiJson } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
});

const registerSchema = z
  .object({
    email: z.string().email({ message: "Email inválido" }),
    password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
    confirmPassword: z.string(),
    name: z.string().min(1, { message: "Nome é obrigatório" }),
    phone: z.string().min(10, { message: "Telefone é obrigatório" }).regex(/^\d{10,15}$/, { message: "Telefone inválido" }),
    cpf: z.string().min(1, { message: "CPF/CNPJ é obrigatório" }).refine((val) => {
      const clean = (val || '').replace(/\D/g, '');
      return clean.length === 11 || clean.length === 14;
    }, { message: "CPF/CNPJ inválido" }),
    userType: z.enum(["client", "provider"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export default function AuthPage() {



  
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    cpf?: string;
  }>({});
  const [formValues, setFormValues] = useState<any>({});
  const [, setLocation] = useLocation();
  
  // Verificação de autenticação usando o hook useAuth
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  

  
  // Não precisamos mais monitorar mutations, fazemos login direto
  
  // Efeito para redirecionar usuário logado
  React.useEffect(() => {
    if (user && !isLoading) {
      const redirectPath = user.userType === "client" ? "/client/dashboard" :
                          user.userType === "provider" ? "/provider/dashboard" :
                          user.userType === "admin" ? "/admin/dashboard" : "/";
      
      setLocation(redirectPath);
    }
  }, [user, isLoading, setLocation]);
  
  // Login - sempre declarar antes de qualquer condição
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Registro - sempre declarar antes de qualquer condição
  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      phone: "",
      cpf: "",
      userType: "client",
    },
  });
  
  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#58c9d1] mx-auto mb-3"></div>
          <p className="text-gray-700 text-sm">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se já estiver logado, mostrar loading enquanto redireciona
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#58c9d1] mx-auto mb-3"></div>
          <p className="text-gray-700 text-sm">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // Login handler - DIRETO SEM MUTATION
  async function onLoginSubmit(data: any) {
    setLoginError(null); // Limpar erro anterior
    setLoading(true);
    
    try {

      
      // Fazer login direto
      const response = await apiJson("/api/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      

      
              if (response && response.token) {
          // Salvar token
          try {
            localStorage.setItem('authToken', response.token);
          } catch (error) {
            
          }
          
          try {
            sessionStorage.setItem('authToken', response.token);
          } catch (error) {
            
          }
        
        // Mostrar toast de sucesso
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo(a) de volta, ${response.user?.name || response.user?.email}!`,
        });
        
        // Redirecionar baseado no tipo de usuário
        setTimeout(() => {
          if (response.user?.userType === 'provider') {
            window.location.href = '/provider/dashboard';
          } else if (response.user?.userType === 'admin') {
            window.location.href = '/admin/dashboard';
          } else {
            window.location.href = '/client/dashboard';
          }
        }, 1000);
        
      } else {
        throw new Error("Token não encontrado na resposta da API");
      }
      
    } catch (error: any) {
      
      
      // Tratamento específico de erros
      let errorTitle = "Erro ao entrar";
      let errorMessage = "Verifique seus dados e tente novamente.";
      
      if (error.message) {
        if (error.message.includes('403') || error.message.includes('desativada') || error.message.includes('conta foi desativada')) {
          errorTitle = "Conta desativada";
          errorMessage = "Esta conta foi desativada. Entre em contato com o suporte se precisar reativar sua conta.";
        } else if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('credenciais')) {
          errorTitle = "Credenciais inválidas";
          errorMessage = "Email ou senha incorretos. Verifique e tente novamente.";
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorTitle = "Usuário não encontrado";
          errorMessage = "Não encontramos uma conta com este email.";
        } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
          errorTitle = "Dados inválidos";
          errorMessage = "Verifique se o email e senha estão corretos.";
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          errorTitle = "Erro no servidor";
          errorMessage = "Ocorreu um erro interno. Tente novamente em alguns minutos.";
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorTitle = "Erro de conexão";
          errorMessage = "Verifique sua conexão com a internet e tente novamente.";
        } else {
          errorMessage = error.message;
        }
      }

      setLoginError(errorMessage);
      toast({ 
        title: errorTitle, 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }

  // Função para validar CPF/CNPJ em tempo real
  const validateCpf = async (cpf: string) => {
    if (!cpf || cpf.length < 11) return;
    
    const cleanedCpf = cpf.replace(/\D/g, '');
    // Aceitar tanto CPF (11 dígitos) quanto CNPJ (14 dígitos)
    if (cleanedCpf.length < 11 || cleanedCpf.length > 14) return;
    
    try {
      const response = await apiJson("/api/check-cpf", {
        method: "POST",
        body: JSON.stringify({ cpf: cleanedCpf }),
      });
      
      if (response.exists) {
        const documentType = cleanedCpf.length === 11 ? 'CPF' : 'CNPJ';
        setValidationErrors(prev => ({ ...prev, cpf: `Este ${documentType} já está cadastrado` }));
      } else {
        setValidationErrors(prev => ({ ...prev, cpf: undefined }));
      }
    } catch (error) {
      // Ignorar erros de validação em tempo real
    }
  };

  // Função para validar email em tempo real
  const validateEmail = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    try {
      const response = await apiJson("/api/check-email", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      
      if (response.exists) {
        setValidationErrors(prev => ({ ...prev, email: "Este email já está cadastrado" }));
      } else {
        setValidationErrors(prev => ({ ...prev, email: undefined }));
      }
    } catch (error) {
      // Ignorar erros de validação em tempo real
    }
  };

  // Função para verificar se o formulário está válido
  const isFormValid = () => {
    const values = registerForm.getValues();
    const hasErrors = registerForm.formState.errors;
    const hasValidationErrors = validationErrors.email || validationErrors.cpf;
    
    // Verificar se todos os campos obrigatórios estão preenchidos
    const allFieldsFilled = values.email && 
                           values.password && 
                           values.confirmPassword && 
                           values.name && 
                           values.phone && 
                           values.cpf;
    
    // Verificar se não há erros de validação
    const noErrors = Object.keys(hasErrors).length === 0 && !hasValidationErrors;
    
    // Verificar se as senhas coincidem
    const passwordsMatch = values.password === values.confirmPassword;
    
    // Verificar se o email é válido
    const emailValid = values.email && values.email.includes('@');
    
    // Verificar se o CPF/CNPJ é válido (11 dígitos para CPF ou 14 para CNPJ)
    const cleanedCpf = values.cpf ? values.cpf.replace(/\D/g, '') : '';
    const cpfValid = cleanedCpf.length === 11 || cleanedCpf.length === 14;
    
    return allFieldsFilled && noErrors && passwordsMatch && emailValid && cpfValid;
  };

  // Atualizar valores do formulário quando mudarem
  React.useEffect(() => {
    const subscription = registerForm.watch((values) => {
      setFormValues(values);
    });
    return () => subscription.unsubscribe();
  }, [registerForm]);

  // Registro handler - DIRETO SEM MUTATION
  async function onRegisterSubmit(data: any) {
    setRegisterError(null); // Limpar erro anterior
    setValidationErrors({}); // Limpar erros de validação
    
    // Verificar se há erros de validação
    if (validationErrors.email || validationErrors.cpf) {
      setRegisterError("Por favor, corrija os erros antes de continuar");
      return;
    }
    
    setLoading(true);
    const { confirmPassword, ...registerData } = data;
    // Normalizar CPF/CNPJ antes do envio
    if (registerData.cpf) {
      registerData.cpf = registerData.cpf.replace(/\D/g, '');
    }
    
    try {

      
      // Fazer registro direto
      const response = await apiJson("/api/register", {
        method: "POST",
        body: JSON.stringify(registerData),
      });
      

      
      if (response && response.token) {
        // Salvar token
        try {
          localStorage.setItem('authToken', response.token);
        } catch (error) {
          
        }
        
        try {
          sessionStorage.setItem('authToken', response.token);
        } catch (error) {
          
        }
        
        // Mostrar toast de sucesso
        toast({
          title: "Conta criada com sucesso!",
          description: "Bem-vindo(a) ao AgendoAI!",
        });
        
        // Redirecionar baseado no tipo de usuário
        setTimeout(() => {
          if (response.user?.userType === 'provider') {
            window.location.href = '/provider/dashboard';
          } else if (response.user?.userType === 'admin') {
            window.location.href = '/admin/dashboard';
          } else {
            window.location.href = '/client/dashboard';
          }
        }, 1000);
        
      } else {
        throw new Error("Token não encontrado na resposta da API");
      }
      
    } catch (error: any) {
      // Exibir exatamente a mensagem retornada pelo backend
      const serverMessage = error?.message || "Verifique seus dados e tente novamente.";
      let errorTitle = "Erro ao cadastrar";

      const msg = serverMessage.toLowerCase();
      if (msg.includes('email') && msg.includes('já está cadastrado')) {
        errorTitle = "Email já cadastrado";
      } else if ((msg.includes('cpf') || msg.includes('cnpj')) && msg.includes('já está cadastrado')) {
        errorTitle = "CPF/CNPJ já cadastrado";
      } else if (msg.includes('todos os campos obrigatórios')) {
        errorTitle = "Campos obrigatórios";
      } else if (msg.includes('cpf/cnpj inválido') || (msg.includes('cpf') && msg.includes('inválido'))) {
        errorTitle = "CPF/CNPJ inválido";
      } else if (msg.includes('500') || msg.includes('internal server error')) {
        errorTitle = "Erro no servidor";
      } else if (msg.includes('network') || msg.includes('fetch')) {
        errorTitle = "Erro de conexão";
      } else if (msg.includes('asaas')) {
        errorTitle = "Erro no sistema de pagamento";
      }

      setRegisterError(serverMessage);
      toast({ 
        title: errorTitle, 
        description: serverMessage, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 px-4 py-8">
      {/* Header */}
      <div className="mb-6 w-full max-w-md text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">AgendoAI</h1>
        <p className="text-base md:text-lg mb-4 text-gray-600">Revolucione seus agendamentos com IA</p>
        <div className="flex flex-wrap justify-center gap-2 mb-4 text-sm">
          <span className="flex items-center gap-1 bg-[#58c9d1]/20 text-[#58c9d1] px-3 py-2 rounded-full font-medium">
            <CheckCircle className="h-4 w-4" /> Agendamento inteligente
          </span>
          <span className="flex items-center gap-1 bg-[#58c9d1]/20 text-[#58c9d1] px-3 py-2 rounded-full font-medium">
            <Calendar className="h-4 w-4" /> Gestão de agenda
          </span>
        </div>
      </div>

      {/* Cartão de autenticação */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-xl border border-[#58c9d1]/20 shadow-lg p-6">
        <img
          src="/AgendoAilogo.png"
          alt="AgendoAI Logo"
          className="h-12 w-auto mx-auto mb-4"
          style={{ maxWidth: 100 }}
        />
        
        {/* Tabs */}
        <div className="flex w-full mb-4">
          <button
            className={`flex-1 py-2 rounded-l-lg text-sm font-medium transition-all duration-200 ${
              tab === "login" 
                ? "bg-[#58c9d1] text-white shadow-md" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => {
              setTab("login");
              setLoginError(null);
              setRegisterError(null);
            }}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`flex-1 py-2 rounded-r-lg text-sm font-medium transition-all duration-200 ${
              tab === "register" 
                ? "bg-[#58c9d1] text-white shadow-md" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => {
              setTab("register");
              setLoginError(null);
              setRegisterError(null);
            }}
            type="button"
          >
            Cadastrar
          </button>
        </div>

        {tab === "login" ? (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1 text-center">Bem-vindo de volta!</h2>
            <p className="text-gray-600 mb-4 text-xs text-center">Acesse sua conta para continuar</p>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="w-full space-y-3">
              <div className="relative">
                <Input
                  type="email"
                  placeholder="E-mail"
                  {...loginForm.register("email")}
                  className="h-10 bg-white border border-[#58c9d1]/30 rounded-lg text-gray-900 placeholder:text-gray-500 focus:border-[#58c9d1] pl-10 text-sm"
                  autoComplete="email"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58c9d1] h-4 w-4" />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-red-500 mt-1">{loginForm.formState.errors.email.message as string}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  {...loginForm.register("password")}
                  className="h-10 bg-white border border-[#58c9d1]/30 rounded-lg text-gray-900 placeholder:text-gray-500 focus:border-[#58c9d1] pl-10 pr-10 text-sm"
                  autoComplete="current-password"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58c9d1] h-4 w-4" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#58c9d1] hover:text-gray-700 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-red-500 mt-1">{loginForm.formState.errors.password.message as string}</p>
                )}
              </div>
                                             <Button 
                  type="submit" 
                  className="w-full h-10 mt-2 bg-[#58c9d1] text-white font-medium shadow-md hover:bg-[#58c9d1]/90 transition-all" 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center text-sm">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Entrando...
                    </span>
                  ) : "Entrar"}
                </Button>
                
                {/* Mensagem de erro do login */}
                {loginError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 text-center">{loginError}</p>
                  </div>
                )}
            </form>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1 text-center">Crie sua conta</h2>
            <p className="text-gray-600 mb-4 text-xs text-center">Desbloqueie benefícios exclusivos!</p>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="w-full space-y-3">
              <div className="relative">
                <Input
                  type="email"
                  placeholder="E-mail"
                  {...registerForm.register("email")}
                  className={`h-10 bg-white border rounded-lg text-gray-900 placeholder:text-gray-500 focus:border-[#58c9d1] pl-10 text-sm ${
                    validationErrors.email ? 'border-red-500' : 'border-[#58c9d1]/30'
                  }`}
                  autoComplete="email"
                  onChange={(e) => {
                    registerForm.setValue("email", e.target.value);
                    validateEmail(e.target.value);
                  }}
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58c9d1] h-4 w-4" />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.email.message as string}</p>
                )}
                {validationErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.email}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Nome"
                  {...registerForm.register("name")}
                  className="h-10 bg-white border border-[#58c9d1]/30 rounded-lg text-gray-900 placeholder:text-gray-500 focus:border-[#58c9d1] pl-10 text-sm"
                  autoComplete="name"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58c9d1] h-4 w-4" />
                {registerForm.formState.errors.name && (
                  <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.name.message as string}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  {...registerForm.register("password")}
                  className="h-10 bg-white border border-[#58c9d1]/30 rounded-lg text-gray-900 placeholder:text-gray-500 focus:border-[#58c9d1] pl-10 pr-10 text-sm"
                  autoComplete="new-password"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58c9d1] h-4 w-4" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#58c9d1] hover:text-gray-700 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.password.message as string}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar senha"
                  {...registerForm.register("confirmPassword")}
                  className="h-10 bg-white border border-[#58c9d1]/30 rounded-lg text-gray-900 placeholder:text-gray-500 focus:border-[#58c9d1] pl-10 pr-10 text-sm"
                  autoComplete="new-password"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58c9d1] h-4 w-4" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#58c9d1] hover:text-gray-700 transition-colors"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.confirmPassword.message as string}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Telefone (DDD + número)"
                  {...registerForm.register("phone")}
                  className="h-10 bg-white border border-[#58c9d1]/30 rounded-lg text-gray-900 placeholder:text-gray-500 focus:border-[#58c9d1] pl-10 text-sm"
                  autoComplete="tel"
                  maxLength={15}
                  inputMode="numeric"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58c9d1] h-4 w-4" />
                {registerForm.formState.errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.phone.message as string}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
                    registerForm.watch("userType") === "client" 
                      ? "border-[#58c9d1] bg-[#58c9d1] text-white shadow-md" 
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => registerForm.setValue("userType", "client")}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Users className="h-3 w-3" /> Cliente
                  </div>
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
                    registerForm.watch("userType") === "provider" 
                      ? "border-[#58c9d1] bg-[#58c9d1] text-white shadow-md" 
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => registerForm.setValue("userType", "provider")}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Calendar className="h-3 w-3" /> Prestador
                  </div>
                </button>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="CPF/CNPJ"
                  {...registerForm.register("cpf")}
                  className={`h-10 bg-white border rounded-lg text-gray-900 placeholder:text-gray-500 focus:border-[#58c9d1] pl-10 text-sm ${
                    validationErrors.cpf ? 'border-red-500' : 'border-[#58c9d1]/30'
                  }`}
                  maxLength={20}
                  autoComplete="cpf"
                  onChange={(e) => {
                    registerForm.setValue("cpf", e.target.value);
                    validateCpf(e.target.value);
                  }}
                />
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58c9d1] h-4 w-4" />
                {registerForm.formState.errors.cpf && (
                  <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.cpf.message as string}</p>
                )}
                {validationErrors.cpf && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.cpf}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Digite apenas números (11 para CPF ou 14 para CNPJ)
                </p>
              </div>
              <div className="text-xs text-gray-500 text-center">
                Ao continuar, você concorda com os <span className="underline cursor-pointer">Termos do Serviço</span> e o <span className="underline cursor-pointer">Aviso de Privacidade</span>.
              </div>
              <Button 
                type="submit" 
                className={`w-full h-10 mt-2 font-medium shadow-md transition-all ${
                  isFormValid() && !loading
                    ? 'bg-[#58c9d1] text-white hover:bg-[#58c9d1]/90' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={loading || !isFormValid()}
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center text-sm">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Criando conta...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 justify-center text-sm">
                    Criar conta <CheckCircle className="h-3 w-3" />
                  </span>
                )}
              </Button>
              
              {/* Mensagem de status do formulário */}
              {!isFormValid() && !loading && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600 text-center">
                    {!formValues.email || !formValues.name || !formValues.phone || !formValues.cpf 
                      ? "Preencha todos os campos obrigatórios"
                      : !formValues.password || !formValues.confirmPassword
                      ? "Defina uma senha e confirme"
                      : formValues.password !== formValues.confirmPassword
                      ? "As senhas não coincidem"
                      : formValues.cpf && (formValues.cpf.replace(/\D/g, '').length < 11 || formValues.cpf.replace(/\D/g, '').length > 14)
                      ? "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos"
                      : validationErrors.email || validationErrors.cpf
                      ? "Corrija os erros nos campos destacados"
                      : "Preencha todos os campos para continuar"
                    }
                  </p>
                </div>
              )}
              
              {/* Mensagem de erro do registro */}
              {registerError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 text-center">{registerError}</p>
                </div>
              )}
            </form>
          </>
        )}
        
        <div className="w-full text-center mt-6 text-sm text-gray-400 font-medium">
          &copy; {new Date().getFullYear()} AgendoAI. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
