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
      <div className="min-h-screen bg-gradient-to-br from-[#009ffd] to-[#a1ffce] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se já estiver logado, mostrar loading enquanto redireciona
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#009ffd] to-[#a1ffce] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Redirecionando...</p>
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const userData = await res.json();
      
      toast({ title: "Login realizado!", description: `Bem-vindo(a), ${userData.name || userData.email}` });
      
      // Forçar atualização da página após login
      window.location.reload();
      
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-2">
      {/* Benefícios */}
      <div className="mb-4 w-full max-w-sm text-center text-[#222]">
        <h1 className="text-4xl font-extrabold mb-1 tracking-tight drop-shadow">AgendoAI</h1>
        <p className="text-lg mb-4 font-light">Revolucione seus agendamentos com inteligência artificial</p>
        <div className="flex justify-center gap-3 mb-2 text-xs">
          <span className="flex items-center gap-1 bg-gradient-to-r from-[#009ffd] to-[#a1ffce] text-[#222] px-3 py-1 rounded-full font-semibold shadow-sm"><CheckCircle className="h-4 w-4 text-[#009ffd]" /> Agendamento inteligente</span>
          <span className="flex items-center gap-1 bg-gradient-to-r from-[#009ffd] to-[#a1ffce] text-[#222] px-3 py-1 rounded-full font-semibold shadow-sm"><Calendar className="h-4 w-4 text-[#a1ffce]" /> Gestão de agenda</span>
        </div>
      </div>
      {/* Cartão de autenticação com sombra e borda azul/ciano */}
      <div className="w-full max-w-sm bg-white rounded-2xl border-2 border-[#009ffd]/40 shadow-xl p-7 flex flex-col items-center">
        <img
          src="/AgendoAilogo.png"
          alt="AgendoAI Logo"
          className="h-16 w-auto mb-4 mt-2 drop-shadow-2xl"
          style={{ maxWidth: 120 }}
        />
        <div className="flex w-full mb-6 mt-2">
          <button
            className={`flex-1 py-2 rounded-l-xl text-base font-bold tracking-wide transition-all duration-200 ${tab === "login" ? "bg-gradient-to-r from-[#009ffd] to-[#a1ffce] text-[#222] shadow-lg" : "bg-white text-[#555]/60 hover:bg-[#f0f8ff]"}`}
            onClick={() => setTab("login")}
            type="button"
            style={{boxShadow: tab==='login'?'0 0 8px #009ffd88':''}}
          >
            Entrar
          </button>
          <button
            className={`flex-1 py-2 rounded-r-xl text-base font-bold tracking-wide transition-all duration-200 ${tab === "register" ? "bg-gradient-to-r from-[#009ffd] to-[#a1ffce] text-[#222] shadow-lg" : "bg-white text-[#555]/60 hover:bg-[#f0f8ff]"}`}
            onClick={() => setTab("register")}
            type="button"
            style={{boxShadow: tab==='register'?'0 0 8px #009ffd88':''}}
          >
            Cadastrar
          </button>
        </div>
        {tab === "login" ? (
          <>
            <h2 className="text-2xl font-extrabold text-[#222] mb-1 tracking-tight">Bem-vindo de volta!</h2>
            <p className="text-[#555] mb-4 text-sm">Acesse sua conta para continuar</p>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="w-full space-y-5">
              <div className="relative">
                <Input
                  type="email"
                  placeholder="E-mail"
                  {...loginForm.register("email")}
                  className="h-12 bg-white border-2 border-[#009ffd]/20 rounded-xl text-[#222] placeholder:text-[#888] focus:bg-white focus:border-[#009ffd] pl-12 shadow-sm transition-all"
                  autoComplete="email"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#009ffd] h-5 w-5" />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-pink-600 mt-1 font-semibold animate-pulse">{loginForm.formState.errors.email.message as string}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  {...loginForm.register("password")}
                  className="h-12 bg-white border-2 border-[#009ffd]/20 rounded-xl text-[#222] placeholder:text-[#888] focus:bg-white focus:border-[#009ffd] pl-12 pr-12 shadow-sm transition-all"
                  autoComplete="current-password"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#009ffd] h-5 w-5" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#009ffd] hover:text-[#222] transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-pink-600 mt-1 font-semibold animate-pulse">{loginForm.formState.errors.password.message as string}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-12 mt-2 bg-gradient-to-r from-[#009ffd] to-[#a1ffce] text-[#222] font-extrabold shadow-xl hover:brightness-110 hover:from-[#009ffd] hover:to-[#a1ffce] transition-all duration-200" disabled={loading} style={{boxShadow:'0 0 16px #009ffd55'}}>
                {loading ? (
                  <span className="flex items-center gap-2 justify-center"><span className="w-4 h-4 border-2 border-[#009ffd] border-t-transparent rounded-full animate-spin"></span>Entrando...</span>
                ) : "Entrar"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold text-[#222] mb-1 tracking-tight">Crie sua conta</h2>
            <p className="text-[#555] mb-4 text-sm">Desbloqueie benefícios exclusivos!</p>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="w-full space-y-5">
              <div className="relative">
                <Input
                  type="email"
                  placeholder="E-mail"
                  {...registerForm.register("email")}
                  className="h-12 bg-white border-2 border-[#009ffd]/20 rounded-xl text-[#222] placeholder:text-[#888] focus:bg-white focus:border-[#009ffd] pl-12 shadow-sm transition-all"
                  autoComplete="email"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#009ffd] h-5 w-5" />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-pink-600 mt-1 font-semibold animate-pulse">{registerForm.formState.errors.email.message as string}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Nome"
                  {...registerForm.register("name")}
                  className="h-12 bg-white border-2 border-[#009ffd]/20 rounded-xl text-[#222] placeholder:text-[#888] focus:bg-white focus:border-[#009ffd] pl-12 shadow-sm transition-all"
                  autoComplete="name"
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#009ffd] h-5 w-5" />
                {registerForm.formState.errors.name && (
                  <p className="text-xs text-pink-600 mt-1 font-semibold animate-pulse">{registerForm.formState.errors.name.message as string}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  {...registerForm.register("password")}
                  className="h-12 bg-white border-2 border-[#009ffd]/20 rounded-xl text-[#222] placeholder:text-[#888] focus:bg-white focus:border-[#009ffd] pl-12 pr-12 shadow-sm transition-all"
                  autoComplete="new-password"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#009ffd] h-5 w-5" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#009ffd] hover:text-[#222] transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-pink-600 mt-1 font-semibold animate-pulse">{registerForm.formState.errors.password.message as string}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar senha"
                  {...registerForm.register("confirmPassword")}
                  className="h-12 bg-white border-2 border-[#009ffd]/20 rounded-xl text-[#222] placeholder:text-[#888] focus:bg-white focus:border-[#009ffd] pl-12 pr-12 shadow-sm transition-all"
                  autoComplete="new-password"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#009ffd] h-5 w-5" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#009ffd] hover:text-[#222] transition-colors"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-pink-600 mt-1 font-semibold animate-pulse">{registerForm.formState.errors.confirmPassword.message as string}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Telefone (DDD + número)"
                  {...registerForm.register("phone")}
                  className="h-12 bg-white border-2 border-[#009ffd]/20 rounded-xl text-[#222] placeholder:text-[#888] focus:bg-white focus:border-[#009ffd] pl-12 shadow-sm transition-all"
                  autoComplete="tel"
                  maxLength={15}
                  inputMode="numeric"
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#009ffd] h-5 w-5" />
                {registerForm.formState.errors.phone && (
                  <p className="text-xs text-pink-600 mt-1 font-semibold animate-pulse">{registerForm.formState.errors.phone.message as string}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${registerForm.watch("userType") === "client" ? "border-[#009ffd] bg-gradient-to-r from-[#a1ffce] to-[#009ffd] text-[#222] shadow-md" : "border-[#009ffd]/20 bg-white text-[#888] hover:bg-[#f0f8ff]"}`}
                  onClick={() => registerForm.setValue("userType", "client")}
                  style={{boxShadow: registerForm.watch("userType") === "client" ? '0 0 8px #009ffd88' : ''}}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Users className="h-4 w-4 text-[#009ffd]" /> Cliente
                  </div>
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${registerForm.watch("userType") === "provider" ? "border-[#009ffd] bg-gradient-to-r from-[#009ffd] to-[#a1ffce] text-[#222] shadow-md" : "border-[#009ffd]/20 bg-white text-[#888] hover:bg-[#f0f8ff]"}`}
                  onClick={() => registerForm.setValue("userType", "provider")}
                  style={{boxShadow: registerForm.watch("userType") === "provider" ? '0 0 8px #009ffd88' : ''}}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Calendar className="h-4 w-4 text-[#a1ffce]" /> Prestador
                  </div>
                </button>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="CPF"
                  {...registerForm.register("cpf")}
                  className="h-12 bg-white border-2 border-[#009ffd]/20 rounded-xl text-[#222] placeholder:text-[#888] focus:bg-white focus:border-[#009ffd] pl-12 shadow-sm transition-all"
                  maxLength={18}
                  autoComplete="cpf"
                />
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-[#009ffd] h-5 w-5" />
                {registerForm.formState.errors.cpf && (
                  <p className="text-xs text-pink-600 mt-1 font-semibold animate-pulse">{registerForm.formState.errors.cpf.message as string}</p>
                )}
              </div>
              <div className="text-xs text-[#888] text-center">
                Ao continuar, você concorda com os <span className="underline cursor-pointer">Termos do Serviço</span> e o <span className="underline cursor-pointer">Aviso de Privacidade</span>.
              </div>
              <Button type="submit" className="w-full h-12 mt-2 bg-gradient-to-r from-[#009ffd] to-[#a1ffce] text-[#222] font-extrabold shadow-xl hover:brightness-110 hover:from-[#009ffd] hover:to-[#a1ffce] transition-all duration-200" disabled={loading} style={{boxShadow:'0 0 16px #009ffd55'}}>
                {loading ? (
                  <span className="flex items-center gap-2 justify-center"><span className="w-4 h-4 border-2 border-[#009ffd] border-t-transparent rounded-full animate-spin"></span>Criando conta...</span>
                ) : (
                  <span className="flex items-center gap-2 justify-center">Criar conta <CheckCircle className="h-4 w-4" /></span>
                )}
              </Button>
            </form>
          </>
        )}
        <div className="w-full text-center mt-6 text-xs text-[#bbb] font-semibold">
          &copy; {new Date().getFullYear()} AgendoAI. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
