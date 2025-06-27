import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-2xl border border-blue-100 p-8 sm:p-10 flex flex-col items-center">
        {/* Logo/Nome */}
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/AgendoAilogo.png"
            alt="AgendoAI Logo"
            className="h-20 w-auto mb-2 drop-shadow-md select-none"
            style={{ filter: 'drop-shadow(0 2px 8px #a5b4fc)' }}
          />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent select-none">AgendoAI</span>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">LOGIN</span>
          </div>
          <span className="text-sm text-blue-400 font-medium tracking-wide">Acesse sua conta ou cadastre-se</span>
        </div>
        {/* Formulários */}
        <div className="w-full">
          {showLoginForm ? (
            <>
              <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">Bem-vindo de volta!</h1>
              <p className="text-neutral-600 mb-8">Entre para acessar sua conta</p>

              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700">
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={loginForm.watch("email")}
                      onChange={(e) => loginForm.setValue("email", e.target.value)}
                      className="pl-10 border-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500/80 focus-visible:border-blue-500 bg-blue-50/40"
                    />
                    <Mail className="absolute left-3 top-3 text-blue-300 h-5 w-5" />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm font-medium text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700">
                    Senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginForm.watch("password")}
                      onChange={(e) => loginForm.setValue("password", e.target.value)}
                      className="pl-10 border-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500/80 focus-visible:border-blue-500 bg-blue-50/40"
                    />
                    <Lock className="absolute left-3 top-3 text-blue-300 h-5 w-5" />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-blue-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm font-medium text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="link"
                  className="p-0 text-primary"
                  onClick={navigateToPasswordRecovery}
                >
                  Esqueci minha senha
                </Button>

                <Button
                  type="submit"
                  className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Entrando..." : "ACESSAR"}
                </Button>
              </form>

              <div className="mt-10 text-center">
                <div className="flex items-center justify-center mb-4">
                  <Separator className="flex-grow" />
                  <span className="px-4 text-neutral-500 text-sm">Ou</span>
                  <Separator className="flex-grow" />
                </div>

                <p className="text-neutral-500 text-sm mb-4">
                  Caso você não tenha uma conta
                </p>

                <Button variant="outline" className="w-full border-blue-200 text-blue-700" onClick={toggleForm}>
                  Criar minha conta
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">Crie sua conta,</h1>
              <p className="text-neutral-600 mb-8">Desbloqueie benefícios exclusivos!</p>

              <form
                onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700">
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={registerForm.watch("email")}
                      onChange={(e) => registerForm.setValue("email", e.target.value)}
                      className="pl-10 border-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500/80 focus-visible:border-blue-500 bg-blue-50/40"
                    />
                    <Mail className="absolute left-3 top-3 text-blue-300 h-5 w-5" />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-sm font-medium text-destructive">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Seu nome"
                      value={registerForm.watch("name")}
                      onChange={(e) => registerForm.setValue("name", e.target.value)}
                      className="pl-10 border-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500/80 focus-visible:border-blue-500 bg-blue-50/40"
                    />
                    <User className="absolute left-3 top-3 text-blue-300 h-5 w-5" />
                  </div>
                  {registerForm.formState.errors.name && (
                    <p className="text-sm font-medium text-destructive">
                      {registerForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700">
                    Senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerForm.watch("password")}
                      onChange={(e) => registerForm.setValue("password", e.target.value)}
                      className="pl-10 border-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500/80 focus-visible:border-blue-500 bg-blue-50/40"
                    />
                    <Lock className="absolute left-3 top-3 text-blue-300 h-5 w-5" />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-blue-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm font-medium text-destructive">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700">
                    Confirmar Senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerForm.watch("confirmPassword")}
                      onChange={(e) => registerForm.setValue("confirmPassword", e.target.value)}
                      className="pl-10 border-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500/80 focus-visible:border-blue-500 bg-blue-50/40"
                    />
                    <Lock className="absolute left-3 top-3 text-blue-300 h-5 w-5" />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-blue-300"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm font-medium text-destructive">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700">Tipo de conta</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      className={`py-2 rounded-md border transition-colors duration-200 font-semibold text-sm ${
                        registerForm.watch("userType") === "client"
                          ? "border-blue-500 bg-blue-600 text-white shadow"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}
                      onClick={() => registerForm.setValue("userType", "client")}
                    >
                      Cliente
                    </button>
                    <button
                      type="button"
                      className={`py-2 rounded-md border transition-colors duration-200 font-semibold text-sm ${
                        registerForm.watch("userType") === "provider"
                          ? "border-indigo-500 bg-indigo-600 text-white shadow"
                          : "border-blue-200 bg-blue-50 text-indigo-700"
                      }`}
                      onClick={() => registerForm.setValue("userType", "provider")}
                    >
                      Prestador
                    </button>
                  </div>
                </div>

                <div className="text-xs text-neutral-500 mt-2">
                  Ao continuar, você declara que concorda com os{" "}
                  <button
                    type="button"
                    className="text-primary"
                    onClick={navigateToTerms}
                  >
                    Termos do Serviço
                  </button>{" "}
                  e o{" "}
                  <button
                    type="button"
                    className="text-primary"
                    onClick={navigateToTerms}
                  >
                    Aviso de Privacidade
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Criando conta..." : "CRIAR CONTA"}
                </Button>
              </form>

              <div className="mt-10 text-center">
                <div className="flex items-center justify-center mb-4">
                  <Separator className="flex-grow" />
                  <span className="px-4 text-neutral-500 text-sm">Ou</span>
                  <Separator className="flex-grow" />
                </div>

                <p className="text-neutral-500 text-sm mb-4">Já tem uma conta?</p>

                <Button variant="outline" className="w-full border-blue-200 text-blue-700" onClick={toggleForm}>
                  Acessar minha conta
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
