import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Star, Edit, Trash2, MessageSquare, Send } from "lucide-react";
import { Review } from "@shared/schema.ts";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteReview, useRespondToReview } from "@/hooks/use-reviews";
import { EditReviewDialog } from "./edit-review-dialog";

interface ReviewCardProps {
  review: Review;
  showControls?: boolean;
  showProviderControls?: boolean;
}

export function ReviewCard({ review, showControls = false, showProviderControls = false }: ReviewCardProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [response, setResponse] = useState("");
  
  const { mutate: deleteReview } = useDeleteReview();
  const { mutate: respondToReview, isPending: isSubmittingResponse } = useRespondToReview();

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Data desconhecida";
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };
  
  const handleSubmitResponse = () => {
    if (response.trim()) {
      respondToReview({ id: review.id, response: response.trim() }, {
        onSuccess: () => {
          setResponse("");
          setIsResponding(false);
        }
      });
    }
  };
  
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} 
      />
    ));
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1 mb-1">
              {renderStars(review.rating)}
            </div>
            <CardDescription>
              {formatDate(review.publishedAt)}
              {!review.isPublic && " (Privado)"}
            </CardDescription>
          </div>
          
          {showControls && user?.id === review.clientId && (
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir avaliação</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteReview(review.id)}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {review.comment && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-1">Comentário do cliente:</h4>
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            </div>
          </div>
        )}
        
        {review.providerResponse && (
          <div className="mt-4 p-3 bg-secondary/50 rounded-md">
            <h4 className="font-medium text-sm mb-1">Resposta do prestador:</h4>
            <p className="text-sm text-muted-foreground">{review.providerResponse}</p>
          </div>
        )}
        
        {showProviderControls && 
         user?.id === review.providerId && 
         !review.providerResponse && 
         !isResponding && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center"
              onClick={() => setIsResponding(true)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Responder
            </Button>
          </div>
        )}
        
        {isResponding && (
          <div className="mt-4 space-y-2">
            <Textarea 
              placeholder="Escreva sua resposta a esta avaliação..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsResponding(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="default" 
                size="sm"
                className="flex items-center"
                onClick={handleSubmitResponse}
                disabled={!response.trim() || isSubmittingResponse}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      {isEditing && (
        <EditReviewDialog 
          review={review} 
          open={isEditing} 
          onOpenChange={setIsEditing} 
        />
      )}
    </Card>
  );
}