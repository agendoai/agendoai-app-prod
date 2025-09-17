# 🔄 Sistema Dinâmico de Atualização de Saldo

## 📋 **Visão Geral**

Este documento descreve como funciona o sistema automático de atualização de saldo dos prestadores quando agendamentos são marcados como pagos.

## 🚀 **Fluxo Automático**

### 1️⃣ **Cenários de Ativação**

O saldo é atualizado automaticamente nos seguintes casos:

#### **A) Webhook ASAAS (Pagamento Online)**
- **Arquivo**: `server/routes/asaas-webhook-routes.ts`
- **Trigger**: Evento `PAYMENT_RECEIVED` do ASAAS
- **Ação**: Atualiza `paymentStatus` para `"confirmado"` e sincroniza saldo

#### **B) Atualização Manual de Status**
- **Arquivo**: `server/routes/appointment-status-routes.ts`
- **Endpoint**: `PUT /api/appointment/:id/status`
- **Trigger**: Quando `paymentStatus` é alterado para status pago
- **Ação**: Sincroniza saldo automaticamente

### 2️⃣ **Status de Pagamento Válidos**

O sistema considera os seguintes status como "pagamento confirmado":
- `"paid"`
- `"confirmed"`
- `"confirmado"`
- `"pago"`
- `"completed"`

### 3️⃣ **Processo de Atualização**

```typescript
// 1. Detectar mudança de status de pagamento
if (paymentStatus === 'paid' || paymentStatus === 'confirmado' || ...) {
  
  // 2. Importar BalanceService
  const { BalanceService } = await import('../services/balance-service.js');
  
  // 3. Sincronizar saldo do prestador
  await BalanceService.syncProviderBalance(providerId);
  
  // 4. Log de confirmação
  console.log(`💰 Saldo do provider ${providerId} atualizado automaticamente`);
}
```

## 🔧 **Componentes do Sistema**

### **BalanceService** (`server/services/balance-service.ts`)

#### **Função Principal**: `syncProviderBalance(providerId)`
- Calcula saldo total baseado em agendamentos pagos
- Considera saques pendentes
- Atualiza tabela `providerBalances`

#### **Filtros de Agendamentos Válidos**:
```typescript
// Status do agendamento
appointment.status === 'completed' || 
appointment.status === 'confirmed' || 
appointment.status === 'confirmado' || 
appointment.status === 'executing'

// Status do pagamento
appointment.paymentStatus === 'paid' || 
appointment.paymentStatus === 'confirmed' || 
appointment.paymentStatus === 'confirmado' || 
appointment.paymentStatus === 'pago' || 
appointment.paymentStatus === 'completed'

// Valor válido
appointment.totalPrice && appointment.totalPrice > 0
```

### **Tabela providerBalances** (`shared/schema.ts`)
```sql
CREATE TABLE providerBalances (
  id SERIAL PRIMARY KEY,
  providerId INTEGER NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0,           -- Saldo total calculado
  availableBalance DECIMAL(10,2) DEFAULT 0,  -- Saldo disponível para saque
  pendingBalance DECIMAL(10,2) DEFAULT 0,    -- Saldo em saques pendentes
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## 📊 **Endpoints Disponíveis**

### **1. Atualizar Status de Agendamento**
```http
PUT /api/appointment/:id/status
Content-Type: application/json

{
  "status": "completed",
  "paymentStatus": "paid"
}
```

### **2. Webhook ASAAS**
```http
POST /api/webhook/asaas
Content-Type: application/json

{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_123456789",
    "status": "RECEIVED"
  }
}
```

## 🔍 **Logs e Monitoramento**

### **Logs de Webhook**
```
💰 WEBHOOK - Saldo do provider 123 atualizado após pagamento confirmado
```

### **Logs de Atualização Manual**
```
💰 PAYMENT CONFIRMED - Saldo do provider 123 atualizado automaticamente
```

### **Logs de Erro**
```
Erro ao atualizar saldo do provider 123: [detalhes do erro]
```

## ⚡ **Vantagens do Sistema Dinâmico**

1. **Tempo Real**: Saldo atualiza imediatamente após confirmação de pagamento
2. **Automático**: Não requer intervenção manual ou scripts
3. **Confiável**: Funciona tanto para pagamentos online quanto manuais
4. **Auditável**: Logs detalhados para rastreamento
5. **Consistente**: Usa a mesma lógica de cálculo em todos os cenários

## 🛠️ **Manutenção**

### **Script de Sincronização Manual**
Para sincronizar todos os saldos (uso esporádico):
```bash
npx tsx sync-balances-ts.ts
```

### **Verificação de Integridade**
O sistema mantém consistência automática, mas em caso de problemas:
1. Verificar logs de erro
2. Executar script de sincronização manual
3. Validar filtros de status no `BalanceService`

## 🔒 **Segurança**

- Todas as rotas de atualização requerem autenticação
- Validação de dados de entrada
- Tratamento de erros robusto
- Logs de auditoria completos

---

**Última atualização**: 15/09/2025
**Versão**: 1.0
