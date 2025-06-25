import { Helmet } from "react-helmet";
import { useAuth } from "@/hooks/use-auth";
import { useProviderReviews } from "@/hooks/use-reviews";
import { ProviderLayout } from "@/components/layout/provider-layout";
import { ReviewsList } from "@/components/reviews/reviews-list";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";

export default function ProviderReviewsPage() {
  const { user } = useAuth();
  const { 
    data: reviews, 
    isLoading, 
    error 
  } = useProviderReviews(user?.id || 0);

  return (
    <>
      <Helmet>
        <title>Minhas Avaliações | AgendoAI</title>
      </Helmet>
      
      <ProviderLayout>
        <div className="container py-6 space-y-6 max-w-5xl">
          <div>
            <h1 className="text-3xl font-bold">Minhas Avaliações</h1>
            <p className="text-muted-foreground mt-1">
              Veja e responda às avaliações dos seus clientes.
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Avaliações Recebidas</CardTitle>
              <CardDescription>
                Todas as avaliações públicas que você recebeu de clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReviewsList 
                reviews={reviews} 
                isLoading={isLoading} 
                error={error} 
                showProviderControls={true}
                emptyMessage="Você ainda não recebeu nenhuma avaliação pública."
              />
            </CardContent>
          </Card>
        </div>
      </ProviderLayout>
    </>
  );
}