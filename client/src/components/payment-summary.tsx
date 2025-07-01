import { Separator } from "@/components/ui/separator";

interface Service {
  id: number;
  name: string;
  price: number | null;
}

interface PaymentSummaryProps {
  servicePrice: number;
  taxaServico: number;
  totalPrice?: number;
  services?: Service[]; // Lista opcional de serviços para exibir detalhadamente
}

export function PaymentSummary({ servicePrice, taxaServico, totalPrice, services }: PaymentSummaryProps) {
  // Função para formatar valor como moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  };

  // Calcular o preço total se não for fornecido
  const calculatedTotal = totalPrice !== undefined ? totalPrice : servicePrice + taxaServico;

  return (
    <div>
      <h4 className="font-medium text-sm mb-2">Resumo do Pagamento</h4>
      <div className="space-y-2">
        {/* Exibir detalhamento de serviços se disponível */}
        {services && services.length > 1 ? (
          <>
            <div className="text-sm text-muted-foreground">Serviços:</div>
            {services.map((service) => (
              <div key={service.id} className="flex justify-between text-sm pl-2">
                <span className="text-muted-foreground">{service.name}:</span>
                <span>{formatCurrency(service.price || 0)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(servicePrice)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor do serviço:</span>
            <span>{formatCurrency(servicePrice)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Taxa de serviço:</span>
          <span>+ {formatCurrency(taxaServico)}</span>
        </div>
        <div className="flex justify-between font-semibold text-sm pt-1 border-t border-border mt-2">
          <span>Total:</span>
          <span>{formatCurrency(calculatedTotal)}</span>
        </div>
      </div>
    </div>
  );
}