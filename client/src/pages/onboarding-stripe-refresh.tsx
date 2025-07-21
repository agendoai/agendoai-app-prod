import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '../components/ui/button';

export default function OnboardingStripeRefreshPage() {
  const [, navigate] = useLocation();

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24, textAlign: 'center', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0001' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>Onboarding Stripe não concluído</h1>
      <p style={{ fontSize: 17, marginBottom: 24 }}>
        O processo de cadastro no Stripe Connect não foi finalizado.<br/>
        Você pode tentar novamente a qualquer momento.
      </p>
      <Button onClick={() => navigate('/provider/analytics-page')}>Voltar para o painel do prestador</Button>
    </div>
  );
} 