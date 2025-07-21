import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '../components/ui/button';

export default function OnboardingStripeReturnPage() {
  const [, navigate] = useLocation();

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24, textAlign: 'center', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0001' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Onboarding Stripe concluído!</h1>
      <p style={{ fontSize: 18, marginBottom: 24 }}>
        Sua conta Stripe Connect foi configurada com sucesso.<br/>
        Agora você pode receber pagamentos pela plataforma.
      </p>
      <Button onClick={() => navigate('/provider/analytics-page')}>Ir para painel do prestador</Button>
    </div>
  );
} 