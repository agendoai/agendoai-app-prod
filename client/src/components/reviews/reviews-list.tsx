import { Review } from "@shared/schema.ts";
import { ReviewCard } from "./review-card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewsListProps {
  reviews: Review[] | undefined;
  isLoading: boolean;
  error: Error | null;
  emptyMessage?: string;
  showControls?: boolean;
  showProviderControls?: boolean;
}

export function ReviewsList({
  reviews,
  isLoading,
  error,
  emptyMessage = "Nenhuma avaliação encontrada.",
  showControls = false,
  showProviderControls = false
}: ReviewsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="w-4 h-4 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Não foi possível carregar as avaliações. {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          showControls={showControls}
          showProviderControls={showProviderControls}
        />
      ))}
    </div>
  );
}