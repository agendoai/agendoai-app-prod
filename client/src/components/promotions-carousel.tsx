import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Sparkles, Tag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type Promotion = {
  id: number;
  title: string;
  description: string | null;
  discountPercentage: number | null;
  discountValue: number | null;
  serviceId: number | null;
  providerId: number | null;
  categoryId: number | null;
  nicheId: number | null;
  startDate: string;
  endDate: string;
  couponCode: string | null;
  isActive: boolean;
  backgroundColor: string | null;
  textColor: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function PromotionsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const {
    data: promotions = [],
    isLoading,
    isError,
  } = useQuery<Promotion[]>({
    queryKey: ["/api/promotions/active"],
  });

  // Definir índice atual como 0 quando as promoções são carregadas
  useEffect(() => {
    if (promotions.length > 0) {
      setCurrentIndex(0);
    }
  }, [promotions.length]);

  // Não mostrar nada se não houver promoções
  if (promotions.length === 0 && !isLoading && !isError) {
    return null;
  }

  // Estados de carregamento e erro
  if (isLoading) {
    return (
      <div className="w-full mb-6">
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return null;
  }

  // Funções de navegação
  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? promotions.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === promotions.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  // Funções para swipe em dispositivos móveis
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Formatador de preço
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  // Renderização da promoção atual
  const currentPromotion = promotions[currentIndex];
  const backgroundColor = currentPromotion?.backgroundColor || "#4F46E5";
  const textColor = currentPromotion?.textColor || "#FFFFFF";

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="relative w-full mb-6">
      <Card
        className="w-full overflow-hidden rounded-xl relative"
        style={{ backgroundColor }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="px-4 py-5 flex flex-col h-full"
          style={{ color: textColor }}
        >
          <div className="flex items-center mb-2">
            <Sparkles
              className={cn("h-5 w-5 mr-2", textColor ? "text-current" : "text-yellow-300")}
            />
            <h3 className="font-bold">{currentPromotion.title}</h3>
          </div>

          {currentPromotion.description && (
            <p className="text-sm mb-3 opacity-90">{currentPromotion.description}</p>
          )}

          <div className="flex items-center mt-auto">
            <div className="flex-1">
              {currentPromotion.discountPercentage ? (
                <div className="text-2xl font-bold mb-1">
                  {currentPromotion.discountPercentage}% OFF
                </div>
              ) : currentPromotion.discountValue ? (
                <div className="text-2xl font-bold mb-1">
                  {formatCurrency(currentPromotion.discountValue)} OFF
                </div>
              ) : null}

              {currentPromotion.couponCode && (
                <div className="flex items-center">
                  <Tag
                    className={cn("h-4 w-4 mr-1", textColor ? "text-current" : "text-white")}
                  />
                  <span className="text-sm font-medium">
                    Cupom: {currentPromotion.couponCode}
                  </span>
                </div>
              )}

              <div className="text-xs mt-2 opacity-80">
                Válido de {formatDate(currentPromotion.startDate)} até{" "}
                {formatDate(currentPromotion.endDate)}
              </div>
            </div>
          </div>
        </div>

        {promotions.length > 1 && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-background/20 hover:bg-background/40 text-white p-1 rounded-full h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-background/20 hover:bg-background/40 text-white p-1 rounded-full h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </Card>

      {/* Indicadores de slide */}
      {promotions.length > 1 && (
        <div className="flex justify-center mt-2">
          {promotions.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-1.5 rounded-full mx-1 ${
                index === currentIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}