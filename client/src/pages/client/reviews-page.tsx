import { Helmet } from "react-helmet";
import ClientLayout from "@/components/layout/client-layout";
import { useClientReviews } from "@/hooks/use-reviews";
import { ReviewsList } from "@/components/reviews/reviews-list";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";

export default function ClientReviewsPage() {
  const { data: reviews, isLoading, error } = useClientReviews();

  return (
    <>
      <Helmet>
        <title>Minhas Avaliações | AgendoAI</title>
      </Helmet>
      
      <ClientLayout>
        <div className="container py-6 space-y-6 max-w-5xl">
          <div>
            <h1 className="text-3xl font-bold">Minhas Avaliações</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas avaliações para prestadores de serviços.
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Avaliações Enviadas</CardTitle>
              <CardDescription>
                Todas as avaliações que você enviou para prestadores de serviços.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReviewsList 
                reviews={reviews} 
                isLoading={isLoading} 
                error={error} 
                showControls={true}
                emptyMessage="Você ainda não enviou nenhuma avaliação. Após concluir um agendamento, você poderá avaliar o serviço."
              />
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    </>
  );
}