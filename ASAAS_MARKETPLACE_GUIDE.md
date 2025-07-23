# 🚀 Guia do Marketplace Asaas - AgendoAi

Este guia explica como usar o sistema de marketplace implementado com Asaas, incluindo split de pagamentos, custódia, onboarding de prestadores e consulta de saldos.

## 📋 Pré-requisitos

1. **Conta Asaas configurada** com API Key
2. **Wallet ID da plataforma** configurado
3. **Asaas habilitado** nas configurações de pagamento

## 🔧 Configuração Inicial

### 1. Configurar Asaas no Painel Admin

```bash
# Acesse o painel admin e configure:
- API Key do Asaas
- Modo (sandbox/produção)
- Wallet ID da plataforma
```

### 2. Testar Conexão

```bash
# Teste se a conexão está funcionando
POST /api/admin/test-asaas-connection
{
  "apiKey": "sua_api_key",
  "liveMode": false
}
```

## 👥 Onboarding de Prestadores

### Cadastrar Novo Prestador

```bash
POST /api/asaas-marketplace/providers
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "João Silva",
  "email": "joao@email.com",
  "cpfCnpj": "12345678901",
  "phone": "11999999999",
  "bankAccount": {
    "bank": "001",
    "accountNumber": "123456",
    "accountDigit": "7",
    "branchNumber": "0001",
    "branchDigit": "0",
    "accountType": "CHECKING"
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "providerId": 123,
  "walletId": "3feca16f-330f-4004-a347-f2e5a0508817",
  "message": "Prestador cadastrado com sucesso"
}
```

### Consultar Dados do Prestador

```bash
GET /api/asaas-marketplace/providers/123
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "provider": {
    "id": 123,
    "name": "João Silva",
    "email": "joao@email.com",
    "cpfCnpj": "12345678901",
    "phone": "11999999999",
    "asaasWalletId": "3feca16f-330f-4004-a347-f2e5a0508817",
    "bankAccount": {
      "bank": "001",
      "accountNumber": "123456",
      "accountDigit": "7",
      "branchNumber": "0001",
      "branchDigit": "0",
      "accountType": "CHECKING"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## 💰 Consulta de Saldos

### Saldo do Prestador

```bash
GET /api/asaas-marketplace/providers/123/balance
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "balance": 150.75,
  "walletId": "3feca16f-330f-4004-a347-f2e5a0508817"
}
```

### Saldo da Plataforma (Admin)

```bash
GET /api/asaas-marketplace/admin/balance
Authorization: Bearer <admin_token>
```

**Resposta:**
```json
{
  "success": true,
  "balance": 1250.50
}
```

## 💳 Criação de Pagamentos com Split

### Criar Agendamento com Pagamento

```bash
POST /api/asaas-marketplace/payments
Content-Type: application/json
Authorization: Bearer <token>

{
  "customerId": "126327429",
  "providerId": 123,
  "serviceValue": 50.00,
  "billingType": "PIX",
  "description": "Corte de cabelo - João Silva",
  "dueDate": "2024-01-20"
}
```

**Resposta:**
```json
{
  "success": true,
  "paymentId": "payment_456",
  "asaasPaymentId": "pay_789",
  "totalValue": 51.75,
  "serviceValue": 50.00,
  "platformFee": 1.75,
  "message": "Pagamento criado com sucesso"
}
```

**O que acontece:**
- Cliente paga R$ 51,75 (R$ 50,00 + R$ 1,75 taxa)
- R$ 1,75 vai para a plataforma (liberado na hora)
- R$ 50,00 fica retido para o prestador (custódia)

## 🔓 Liberação de Repasse (Custódia)

### Liberar Valor para o Prestador

```bash
POST /api/asaas-marketplace/payments/payment_456/release
Authorization: Bearer <admin_token>
```

**Resposta:**
```json
{
  "success": true,
  "message": "Repasse liberado com sucesso"
}
```

**O que acontece:**
- R$ 50,00 é liberado para a conta bancária do prestador
- O valor sai da custódia e vai para o saldo disponível

## 📊 Consulta de Status

### Verificar Status do Pagamento

```bash
GET /api/asaas-marketplace/payments/payment_456/status
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "status": "CONFIRMED",
  "payment": {
    "id": "payment_456",
    "totalValue": 51.75,
    "serviceValue": 50.00,
    "platformFee": 1.75,
    "billingType": "PIX",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## ❌ Cancelamento

### Cancelar Pagamento

```bash
POST /api/asaas-marketplace/payments/payment_456/cancel
Authorization: Bearer <admin_token>
```

**Resposta:**
```json
{
  "success": true,
  "message": "Pagamento cancelado com sucesso"
}
```

## 🏦 Listagem de Carteiras (Admin)

### Ver Todas as Carteiras

```bash
GET /api/asaas-marketplace/admin/wallets
Authorization: Bearer <admin_token>
```

**Resposta:**
```json
{
  "success": true,
  "wallets": [
    {
      "id": "3feca16f-330f-4004-a347-f2e5a0508817",
      "name": "João Silva",
      "email": "joao@email.com",
      "balance": 150.75
    },
    {
      "id": "4feca16f-330f-4004-a347-f2e5a0508818",
      "name": "Maria Santos",
      "email": "maria@email.com",
      "balance": 75.25
    }
  ]
}
```

## 🔄 Fluxo Completo do Marketplace

### 1. **Onboarding do Prestador**
```javascript
// 1. Prestador se cadastra no app
const provider = await fetch('/api/asaas-marketplace/providers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@email.com',
    cpfCnpj: '12345678901',
    bankAccount: { /* dados bancários */ }
  })
});
// → Cria wallet no Asaas automaticamente
```

### 2. **Cliente Agenda e Paga**
```javascript
// 2. Cliente agenda serviço
const payment = await fetch('/api/asaas-marketplace/payments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: '126327429',
    providerId: 123,
    serviceValue: 50.00,
    billingType: 'PIX'
  })
});
// → Split automático: R$ 1,75 para plataforma, R$ 50,00 retido para prestador
```

### 3. **Admin Libera Repasse**
```javascript
// 3. Após serviço concluído, admin libera
const release = await fetch('/api/asaas-marketplace/payments/payment_456/release', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer admin_token' }
});
// → R$ 50,00 vai para conta bancária do prestador
```

## 💡 Dicas Importantes

### Para Clientes
- Não precisam criar conta no Asaas
- Pagam normalmente via Pix, cartão, boleto
- Recebem confirmação automática

### Para Prestadores
- Só precisam preencher dados no app
- Não precisam acessar painel externo
- Recebem dinheiro direto na conta bancária

### Para Admins
- Controlam liberação de repasses
- Consultam saldos da plataforma
- Gerenciam carteiras de prestadores

## 🚨 Tratamento de Erros

### Erros Comuns

```json
{
  "success": false,
  "message": "Asaas não está configurado"
}
```

```json
{
  "success": false,
  "message": "Prestador não encontrado ou sem carteira"
}
```

```json
{
  "success": false,
  "message": "Erro ao criar cobrança",
  "error": "Detalhes do erro do Asaas"
}
```

## 🔧 Configurações Avançadas

### Taxa da Plataforma
- Atualmente fixa em R$ 1,75 por agendamento
- Pode ser alterada no código do backend
- Calculada automaticamente no split

### Tipos de Pagamento Suportados
- **PIX**: Pagamento instantâneo
- **BOLETO**: Pagamento com vencimento
- **CREDIT_CARD**: Cartão de crédito
- **DEBIT_CARD**: Cartão de débito

### Status de Custódia
- **PENDING**: Valor retido (custódia)
- **RELEASED**: Valor liberado para o prestador

## 📞 Suporte

Para dúvidas sobre a integração com Asaas:
1. Verifique se a API Key está correta
2. Confirme se o modo (sandbox/produção) está correto
3. Teste a conexão via painel admin
4. Consulte os logs do servidor para detalhes de erro 