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
    cpf: z.string().min(11, { message: "CPF é obrigatório" }),
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
  const [, setLocation] = useLocation();
  
  // Verificação de autenticação usando o hook useAuth
  const { user, isLoading } = useAuth();
  
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

  // Login handler
  async function onLoginSubmit(data: any) {
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro no login");
      }
      
      const response = await res.json();
      
      // Salvar token no localStorage
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        console.log('🔑 Token salvo no localStorage');
      }
      
      toast({ title: "Login realizado!", description: `Bem-vindo(a), ${response.user.name || response.user.email}` });
      
      // Recarregar página após login
      setTimeout(() => {
        console.log('🔄 Recarregando página após login...');
        window.location.reload();
      }, 500);
      
    } catch (e: any) {
      toast({ title: "Erro ao entrar", description: e.message || "Verifique seus dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // Registro handler
  async function onRegisterSubmit(data: any) {
    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const userData = await res.json();
      toast({ title: "Conta criada!", description: "Bem-vindo(a) ao AgendoAI!" });
      
      // Forçar atualização da página após registro
      window.location.reload();
      
    } catch (e: any) {
      toast({ title: "Erro ao cadastrar", description: e.message || "Verifique seus dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 p-3">
      {/* Header */}
      <div className="mb-4 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">AgendoAI</h1>
        <p className="text-sm mb-3 text-gray-600">Revolucione seus agendamentos com IA</p>
        <div className="flex justify-center gap-2 mb-3 text-xs">
          <span className="flex items-center gap-1 bg-[#58c9d1]/20 text-[#58c9d1] px-2 py-1 rounded-full font-medium">
            <CheckCircle className="h-3 w-3" /> Agendamento inteligente
          </span>
          <span className="flex items-center gap-1 bg-[#58c9d1]/20 text-[#58c9d1] px-2 py-1 rounded-full font-medium">
            <Calendar className="h-3 w-3" /> Gestão de agenda
          </span>
        </div>
      </div>

      {/* Cartão de autenticação */}
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-sm rounded-xl border border-[#58c9d1]/20 shadow-lg p-4">
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
            onClick={() => setTab("login")}
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
            onClick={() => setTab("register")}
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
                  className="h-10 bg-white border border-[#58c9d1]/30 rounded-lg text-gray-900 placeholder:text-gray-500 focus:border-[#58c9d1] pl-10 text-sm"
                  autoComplete="email"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58c9d1] h-4 w-4" />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.email.message as string}</p>
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
                  placeholder="CPF"
                  {...registerForm.register("cpf")}
                  className="h-10 bg-white border border-[#58c9d1]/30 rounded-lg text-gray-900 placeholder:text-gray-500 focus:border-[#58c9d1] pl-10 text-sm"
                  maxLength={18}
                  autoComplete="cpf"
                />
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58c9d1] h-4 w-4" />
                {registerForm.formState.errors.cpf && (
                  <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.cpf.message as string}</p>
                )}
              </div>
              <div className="text-xs text-gray-500 text-center">
                Ao continuar, você concorda com os <span className="underline cursor-pointer">Termos do Serviço</span> e o <span className="underline cursor-pointer">Aviso de Privacidade</span>.
              </div>
              <Button 
                type="submit" 
                className="w-full h-10 mt-2 bg-[#58c9d1] text-white font-medium shadow-md hover:bg-[#58c9d1]/90 transition-all" 
                disabled={loading}
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
            </form>
          </>
        )}
        
        <div className="w-full text-center mt-4 text-xs text-gray-400 font-medium">
          &copy; {new Date().getFullYear()} AgendoAI. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
