import { StarIcon } from "lucide-react";
import { ProviderSettings } from "@shared/schema.ts";
import { Badge } from "@/components/ui/badge";

interface ProviderRatingProps {
  settings: ProviderSettings | undefined;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProviderRating({ 
  settings, 
  showLabel = true, 
  size = "md" 
}: ProviderRatingProps) {
  if (!settings || !settings.averageRating) {
    return null;
  }

  // Converter o rating para o formato de estrelas (0-5)
  // O rating é armazenado como um número entre 0-50 (45 = 4.5 estrelas)
  const averageRating = settings.averageRating / 10;
  
  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "text-xs";
      case "lg":
        return "text-lg";
      default:
        return "text-sm";
    }
  };
  
  const getStarSize = () => {
    switch (size) {
      case "sm":
        return "w-3 h-3";
      case "lg":
        return "w-5 h-5";
      default:
        return "w-4 h-4";
    }
  };

  return (
    <Badge 
      variant="secondary" 
      className={`flex items-center space-x-1 ${getSizeClass()}`}
    >
      <StarIcon className={`${getStarSize()} fill-yellow-400 text-yellow-400`} />
      <span>{averageRating.toFixed(1)}</span>
      {showLabel && settings.totalReviews !== undefined && (
        <span className="text-muted-foreground">
          ({settings.totalReviews} {settings.totalReviews === 1 ? "avaliação" : "avaliações"})
        </span>
      )}
    </Badge>
  );
}