import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/hooks/use-toast";

// Password recovery form schema
const passwordRecoverySchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
});

type PasswordRecoveryFormValues = z.infer<typeof passwordRecoverySchema>;

export default function PasswordRecoveryPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize the form
  const form = useForm<PasswordRecoveryFormValues>({
    resolver: zodResolver(passwordRecoverySchema),
    defaultValues: {
      email: "",
    },
  });
  
  // Handle form submission
  const onSubmit = async (data: PasswordRecoveryFormValues) => {
    setIsSubmitting(true);
    
    try {
      // In a real app, this would call an API to send a password reset email
      // For now, we'll just simulate it with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      
      // Navigate to email verification page
      setLocation("/email-verification");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o email de recuperação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Navigate back to login page
  const navigateToLogin = () => {
    setLocation("/auth");
  };
  
  return (
    <div className="h-screen bg-white px-6 pt-8">
      <div className="flex justify-between items-center mb-6">
        <BackButton to="/auth" />
        <div></div>
      </div>
      <div className="flex justify-center mb-8">
        <img
          src="/logo-new.png"
          alt="AgendoAI Logo"
          className="h-24 object-contain"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/96?text=AgendoAI";
          }}
        />
      </div>
      
      <h1 className="text-2xl font-bold mb-1">Recupere sua senha!</h1>
      <p className="text-neutral-600 mb-8">
        Insira o e-mail associado à sua conta e enviaremos um e-mail com instruções para redefinir sua senha.
      </p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="seu@email.com"
                      {...field}
                      className="pl-10"
                    />
                    <Mail className="absolute left-3 top-3 text-neutral-400 h-5 w-5" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Enviando..." : "Receber instruções"}
          </Button>
        </form>
      </Form>
      
      <div className="mt-10 text-center">
        <div className="flex items-center justify-center mb-4">
          <Separator className="flex-grow" />
          <span className="px-4 text-neutral-500 text-sm">Ou</span>
          <Separator className="flex-grow" />
        </div>
        
        <Button variant="outline" className="w-full" onClick={navigateToLogin}>
          Acessar conta
        </Button>
      </div>
    </div>
  );
}
