import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, User, Mail, Lock, Sparkles, Calendar, Users, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

// Interface para representar os dados do usuário autenticado
interface AuthUser {
  id: number;
  email: string;
  name?: string;
  userType?: "client" | "provider" | "admin" | "support";
  [key: string]: any;
}

// Login form schema
const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z
    .string()
    .min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
});

// Register form schema
const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: "Email é obrigatório" })
      .email({ message: "Formato de email inválido" }),
    password: z
      .string()
      .min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
    confirmPassword: z
      .string()
      .min(1, { message: "Confirmação de senha é obrigatória" }),
    userType: z.enum(["client", "provider"]),
    name: z.string().min(1, { message: "Nome é obrigatório" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { user: authUser, loginMutation, registerMutation } = useAuth();
  const user = authUser as AuthUser;

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      userType: "client",
      name: "",
    },
  });

  // Get initial form mode from URL query params
  useEffect(() => {
    if (location.includes("?")) {
      const params = new URLSearchParams(location.split("?")[1]);
      const register = params.get("register");
      const type = params.get("type");

      if (register === "true") {
        setShowLoginForm(false);

        // Se o tipo for provider, defina o userType como provider
        if (type === "provider") {
          registerForm.setValue("userType", "provider");
        } else if (type === "client") {
          registerForm.setValue("userType", "client");
        }
      } else if (params.get("action") === "register") {
        setShowLoginForm(false);
      }
    }
  }, [location, registerForm]);

  // If user is already logged in, redirect appropriately
  useEffect(() => {
    if (user) {
      console.log("Usuário já autenticado na página de login, redirecionando:", user);
      
      // Verificar se há parâmetros na URL
      const params = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
      const redirectParam = params.get("redirect");
      
      // Verificar se existe um agendamento pendente no sessionStorage
      const pendingBookingData = sessionStorage.getItem('pendingBooking');
      
      // Usar setTimeout para garantir que o estado está sincronizado
      setTimeout(() => {
        if (redirectParam === "booking" && pendingBookingData && user.userType === "client") {
          try {
            // Recuperar dados de agendamento pendente
            const bookingData = JSON.parse(pendingBookingData);
            
            // Limpar dados de agendamento do sessionStorage
            sessionStorage.removeItem('pendingBooking');
            
            // Redirecionar para a página de confirmação com os dados do agendamento
            console.log("Redirecionando para confirmação de agendamento:", bookingData);
            setLocation(`/client/booking-confirmation/${bookingData.providerId}/${bookingData.serviceId}/${bookingData.date}/${bookingData.startTime}/${bookingData.endTime}`);
          } catch (error: any) {
            console.error("Erro ao processar dados de agendamento pendente:", error);
            // Em caso de erro, redirecionar para o dashboard
            console.log("Redirecionando para dashboard após erro:", user.userType);
            setLocation(user.userType === "client" ? "/client/dashboard" : "/provider/dashboard");
          }
        } else {
          // Redirecionamento padrão para o dashboard
          console.log("Redirecionamento padrão para dashboard:", user.userType);
          
          if (user.userType === "client") {
            setLocation("/client/dashboard");
          } else if (user.userType === "provider") {
            setLocation("/provider/dashboard");
          } else if (user.userType === "admin") {
            setLocation("/admin/dashboard");
          } else if (user.userType === "support") {
            setLocation("/support/dashboard");
          } else {
            // Fallback para cliente se o tipo não for reconhecido
            setLocation("/client/dashboard");
          }
        }
      }, 500);
    } else {
      console.log("Usuário não autenticado na página de login");
    }
  }, [user, setLocation, location]);

  // Handle login form submission
  const onLoginSubmit = (data: LoginFormValues) => {
    try {
      // Basic validation
      if (!data.email || !data.password) {
        toast({
          title: "Erro de validação",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      // Trim values
      const cleanedData = {
        email: data.email.trim(),
        password: data.password,
      };

      console.log("Login com:", cleanedData.email);

      // Implementação direta do login para contornar problemas com o hook
      fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(cleanedData),
        credentials: "include"
      })
      .then(response => {
        console.log("Resposta do servidor login:", response.status, response.statusText);
        console.log("Headers da resposta login:", Object.fromEntries([...response.headers.entries()]));
        
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || "Credenciais inválidas");
          });
        }
        
        return response.json();
      })
      .then(userData => {
        console.log("Login bem-sucedido:", userData);
        
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo(a) de volta, ${userData.name || userData.email}!`,
        });
        
        // Redirecionar manualmente para o dashboard apropriado
        setTimeout(() => {
          const userType = userData.userType || "client";
          console.log("Redirecionando após login para:", userType);
          
          if (userType === "client") {
            window.location.href = "/client/dashboard";
          } else if (userType === "provider") {
            window.location.href = "/provider/dashboard";
          } else if (userType === "admin" || userType === "support") {
            window.location.href = "/admin/dashboard";
          }
        }, 1500);
      })
      .catch(error => {
        console.error("Erro no login:", error);
        toast({
          title: "Falha no login",
          description: error.message || "Credenciais inválidas. Tente novamente.",
          variant: "destructive",
        });
      });
    } catch (error: any) {
      console.error("Erro ao processar formulário de login:", error);
      toast({
        title: "Erro ao processar login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Handle register form submission
  const onRegisterSubmit = (values: RegisterFormValues) => {
    try {
      // Remove confirmPassword as it's not needed for the API
      const { confirmPassword, ...registerData } = values;

      // Basic validation to ensure we have all required fields
      if (
        !registerData.email ||
        !registerData.password ||
        !registerData.name ||
        !registerData.userType
      ) {
        toast({
          title: "Erro de validação",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      // Trim values to remove any extra whitespace
      const cleanedData = {
        ...registerData,
        email: registerData.email.trim(),
        name: registerData.name.trim(),
        password: registerData.password,
        userType: registerData.userType,
      };

      // Log register data to help with debugging
      console.log("Enviando dados de registro:", {
        email: cleanedData.email,
        name: cleanedData.name,
        userType: cleanedData.userType,
        // password omitted for security
      });

      // Adicionar logs para debug
      console.log("Iniciando mutação de registro com dados:", {
        email: cleanedData.email,
        name: cleanedData.name,
        userType: cleanedData.userType,
        // password omitido por segurança
      });
      
      // Implementação direta do registro para contornar problemas com o hook
      // Usando fetch diretamente em vez do hook de mutação
      fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(cleanedData),
        credentials: "include"
      })
      .then(response => {
        console.log("Resposta do servidor:", response.status, response.statusText);
        console.log("Headers da resposta:", Object.fromEntries([...response.headers.entries()]));
        
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || "Erro ao criar a conta");
          });
        }
        
        return response.json();
      })
      .then(userData => {
        console.log("Registro bem-sucedido:", userData);
        
        toast({
          title: "Conta criada com sucesso!",
          description: "Bem-vindo(a) ao AgendoAI! Você será redirecionado em instantes.",
        });
        
        // Redirecionar manualmente para o dashboard apropriado
        setTimeout(() => {
          const userType = userData.userType || "client";
          console.log("Redirecionando para:", userType);
          
          if (userType === "client") {
            window.location.href = "/client/dashboard";
          } else if (userType === "provider") {
            window.location.href = "/provider/dashboard";
          } else if (userType === "admin" || userType === "support") {
            window.location.href = "/admin/dashboard";
          }
        }, 1500);
      })
      .catch(error => {
        console.error("Erro no registro:", error);
        toast({
          title: "Erro ao criar conta",
          description: error.message || "Ocorreu um erro ao criar sua conta. Tente novamente.",
          variant: "destructive",
        });
      });
    } catch (error: any) {
      console.error("Erro ao processar formulário:", error);
      toast({
        title: "Erro ao processar dados",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Toggle between login and register forms
  const toggleForm = () => {
    setShowLoginForm(!showLoginForm);
  };

  // Navigate to password recovery page
  const navigateToPasswordRecovery = () => {
    setLocation("/password-recovery");
  };

  // Navigate to terms page
  const navigateToTerms = () => {
    setLocation("/terms");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-4xl mx-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Branding */}
          <div className="text-center lg:text-left text-white">
            <div className="mb-8">
              <img
                src="/AgendoAilogo.png"
                alt="AgendoAI Logo"
                className="h-24 w-auto mx-auto lg:mx-0 mb-6 drop-shadow-2xl"
              />
              <h1 className="text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
                AgendoAI
              </h1>
              <p className="text-xl lg:text-2xl text-white/90 mb-8 font-light">
                Revolucione seus agendamentos com inteligência artificial
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90">Agendamento inteligente</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90">Gestão completa de agenda</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90">Conecte-se com clientes</span>
              </div>
            </div>
          </div>

          {/* Right side - Auth Forms */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8 lg:p-10">
            {showLoginForm ? (
              <div>
                {/* Login Form */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta!</h2>
                  <p className="text-white/80">Entre para acessar sua conta</p>
                </div>

                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      E-mail
                    </label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={loginForm.watch("email")}
                        onChange={(e) => loginForm.setValue("email", e.target.value)}
                        className="h-12 pl-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/30 focus:border-white/50 transition-all"
                      />
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-300">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Senha
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginForm.watch("password")}
                        onChange={(e) => loginForm.setValue("password", e.target.value)}
                        className="h-12 pl-12 pr-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/30 focus:border-white/50 transition-all"
                      />
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-300">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="link"
                    className="p-0 text-white/80 hover:text-white text-sm"
                    onClick={navigateToPasswordRecovery}
                  >
                    Esqueci minha senha
                  </Button>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-white to-white/90 text-blue-600 font-semibold hover:from-white/90 hover:to-white transition-all shadow-lg"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Entrando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        Acessar conta
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>

                <div className="mt-8 text-center">
                  <div className="flex items-center justify-center mb-6">
                    <Separator className="flex-grow bg-white/20" />
                    <span className="px-4 text-white/60 text-sm">Ou</span>
                    <Separator className="flex-grow bg-white/20" />
                  </div>

                  <p className="text-white/80 text-sm mb-4">Caso você não tenha uma conta</p>

                  <Button 
                    variant="outline" 
                    className="w-full h-12 border-white/30 text-white hover:bg-white/10 transition-all" 
                    onClick={toggleForm}
                  >
                    Criar minha conta
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {/* Register Form */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Crie sua conta</h2>
                  <p className="text-white/80">Desbloqueie benefícios exclusivos!</p>
                </div>

                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      E-mail
                    </label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={registerForm.watch("email")}
                        onChange={(e) => registerForm.setValue("email", e.target.value)}
                        className="h-12 pl-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/30 focus:border-white/50 transition-all"
                      />
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-300">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nome
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Seu nome"
                        value={registerForm.watch("name")}
                        onChange={(e) => registerForm.setValue("name", e.target.value)}
                        className="h-12 pl-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/30 focus:border-white/50 transition-all"
                      />
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                    </div>
                    {registerForm.formState.errors.name && (
                      <p className="text-sm text-red-300">{registerForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Senha
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={registerForm.watch("password")}
                        onChange={(e) => registerForm.setValue("password", e.target.value)}
                        className="h-12 pl-12 pr-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/30 focus:border-white/50 transition-all"
                      />
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-300">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={registerForm.watch("confirmPassword")}
                        onChange={(e) => registerForm.setValue("confirmPassword", e.target.value)}
                        className="h-12 pl-12 pr-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/30 focus:border-white/50 transition-all"
                      />
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-300">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white/90">Tipo de conta</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        className={`py-3 px-4 rounded-xl border transition-all duration-300 font-semibold text-sm ${
                          registerForm.watch("userType") === "client"
                            ? "border-white bg-white/20 text-white shadow-lg"
                            : "border-white/30 bg-white/10 text-white/80 hover:bg-white/20"
                        }`}
                        onClick={() => registerForm.setValue("userType", "client")}
                      >
                        <div className="flex items-center gap-2 justify-center">
                          <Users className="h-4 w-4" />
                          Cliente
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`py-3 px-4 rounded-xl border transition-all duration-300 font-semibold text-sm ${
                          registerForm.watch("userType") === "provider"
                            ? "border-white bg-white/20 text-white shadow-lg"
                            : "border-white/30 bg-white/10 text-white/80 hover:bg-white/20"
                        }`}
                        onClick={() => registerForm.setValue("userType", "provider")}
                      >
                        <div className="flex items-center gap-2 justify-center">
                          <Calendar className="h-4 w-4" />
                          Prestador
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-white/60 text-center">
                    Ao continuar, você concorda com os{" "}
                    <button type="button" className="text-white underline hover:text-white/80">
                      Termos do Serviço
                    </button>{" "}
                    e o{" "}
                    <button type="button" className="text-white underline hover:text-white/80">
                      Aviso de Privacidade
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-white to-white/90 text-blue-600 font-semibold hover:from-white/90 hover:to-white transition-all shadow-lg"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Criando conta...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        Criar conta
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>

                <div className="mt-8 text-center">
                  <div className="flex items-center justify-center mb-6">
                    <Separator className="flex-grow bg-white/20" />
                    <span className="px-4 text-white/60 text-sm">Ou</span>
                    <Separator className="flex-grow bg-white/20" />
                  </div>

                  <p className="text-white/80 text-sm mb-4">Já tem uma conta?</p>

                  <Button 
                    variant="outline" 
                    className="w-full h-12 border-white/30 text-white hover:bg-white/10 transition-all" 
                    onClick={toggleForm}
                  >
                    Acessar minha conta
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
