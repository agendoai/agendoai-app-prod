import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';
import { createAsaasProvider } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Banknote, User, CreditCard } from 'lucide-react';

interface BankAccount {
  bank: string;
  accountNumber: string;
  accountDigit: string;
  branchNumber: string;
  branchDigit: string;
  accountType: 'CHECKING' | 'SAVINGS';
}

const banks = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '033', name: 'Santander' },
  { code: '341', name: 'Itaú' },
  { code: '237', name: 'Bradesco' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '212', name: 'Banco Original' },
  { code: '077', name: 'Inter' },
  { code: '260', name: 'Nubank' },
];

export default function AsaasOnboardingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    cpfCnpj: '',
    phone: '',
    birthDate: '',
    monthlyIncome: '',
    address: '', // Novo campo
    addressNumber: '', // Novo campo
    city: '', // Novo campo
    state: '', // Novo campo
    postalCode: '', // Novo campo
    bankAccount: {
      bank: '',
      accountNumber: '',
      accountDigit: '',
      branchNumber: '',
      branchDigit: '',
      accountType: 'CHECKING' as const,
    } as BankAccount,
  });

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar dados obrigatórios
      if (!formData.name || !formData.email || !formData.cpfCnpj || !formData.birthDate || !formData.monthlyIncome || !formData.address || !formData.addressNumber || !formData.city || !formData.state || !formData.postalCode) {
        throw new Error('Preencha todos os campos obrigatórios, incluindo endereço completo.');
      }

      if (!formData.bankAccount.bank || !formData.bankAccount.accountNumber || 
          !formData.bankAccount.accountDigit || !formData.bankAccount.branchNumber) {
        throw new Error('Todos os dados bancários são obrigatórios');
      }

      // Criar prestador no Asaas
      const result = await createAsaasProvider({
        name: formData.name,
        email: formData.email,
        cpfCnpj: formData.cpfCnpj,
        phone: formData.phone,
        birthDate: formData.birthDate,
        monthlyIncome: formData.monthlyIncome,
        address: formData.address,
        addressNumber: formData.addressNumber,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        bankAccount: formData.bankAccount,
      });

      if (result.success) {
        setSuccess(true);
        // Redirecionar após 3 segundos
        setTimeout(() => {
          setLocation('/provider/dashboard');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar prestador');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Cadastro Concluído!
              </h2>
              <p className="text-gray-600 mb-4">
                Sua conta foi criada com sucesso no sistema de pagamentos.
                Você já pode receber pagamentos dos seus clientes!
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800">
                  <strong>Próximos passos:</strong>
                </p>
                <ul className="text-sm text-green-700 mt-2 space-y-1">
                  <li>• Configure seus serviços</li>
                  <li>• Defina sua agenda</li>
                  <li>• Comece a receber agendamentos</li>
                </ul>
              </div>
              <Button 
                onClick={() => setLocation('/provider/dashboard')}
                className="w-full"
              >
                Ir para o Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Banknote className="w-8 h-8 text-blue-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">
              Configurar Conta de Pagamentos
            </h1>
          </div>
          <p className="text-gray-600 max-w-md mx-auto">
            Complete seu cadastro para começar a receber pagamentos dos seus clientes.
            Seus dados estão seguros e serão usados apenas para processar pagamentos.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Dados Pessoais
            </CardTitle>
            <CardDescription>
              Informações básicas para identificação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => handleInputChange('cpfCnpj', e.target.value)}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyIncome">Renda/Faturamento Mensal *</Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthlyIncome}
                    onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                    placeholder="Ex: 3000.00"
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center mb-4">
                  <User className="w-5 h-5 mr-2" />
                  <h3 className="text-lg font-semibold">Endereço</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campos de endereço obrigatórios */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço (Rua/Avenida) *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Ex: Rua das Flores"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressNumber">Número *</Label>
                    <Input
                      id="addressNumber"
                      value={formData.addressNumber}
                      onChange={(e) => handleInputChange('addressNumber', e.target.value)}
                      placeholder="Ex: 123"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Ex: São Paulo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado (UF) *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                      placeholder="Ex: SP"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">CEP *</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      placeholder="Ex: 01001000"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center mb-4">
                  <CreditCard className="w-5 h-5 mr-2" />
                  <h3 className="text-lg font-semibold">Dados Bancários</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Estes dados são necessários para que você possa receber os pagamentos dos seus clientes.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank">Banco *</Label>
                    <Select
                      value={formData.bankAccount.bank}
                      onValueChange={(value) => handleInputChange('bankAccount.bank', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountType">Tipo de Conta *</Label>
                    <Select
                      value={formData.bankAccount.accountType}
                      onValueChange={(value: 'CHECKING' | 'SAVINGS') => 
                        handleInputChange('bankAccount.accountType', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                        <SelectItem value="SAVINGS">Conta Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchNumber">Agência *</Label>
                    <Input
                      id="branchNumber"
                      value={formData.bankAccount.branchNumber}
                      onChange={(e) => handleInputChange('bankAccount.branchNumber', e.target.value)}
                      placeholder="0001"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchDigit">Dígito da Agência</Label>
                    <Input
                      id="branchDigit"
                      value={formData.bankAccount.branchDigit}
                      onChange={(e) => handleInputChange('bankAccount.branchDigit', e.target.value)}
                      placeholder="0"
                      maxLength={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Número da Conta *</Label>
                    <Input
                      id="accountNumber"
                      value={formData.bankAccount.accountNumber}
                      onChange={(e) => handleInputChange('bankAccount.accountNumber', e.target.value)}
                      placeholder="123456"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountDigit">Dígito da Conta *</Label>
                    <Input
                      id="accountDigit"
                      value={formData.bankAccount.accountDigit}
                      onChange={(e) => handleInputChange('bankAccount.accountDigit', e.target.value)}
                      placeholder="7"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Como funciona o pagamento:</p>
                    <ul className="space-y-1">
                      <li>• Cliente agenda e paga o serviço</li>
                      <li>• Taxa da plataforma (R$ 1,75) é descontada automaticamente</li>
                      <li>• Valor do serviço fica retido até confirmação</li>
                      <li>• Após serviço concluído, valor é liberado para sua conta</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/provider/dashboard')}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Finalizar Cadastro'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 