import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function StarRating({ 
  value = 0, 
  onChange, 
  readOnly = false,
  size = "md",
  className
}: StarRatingProps) {
  // Garantir que o valor está entre 0 e 5
  const rating = Math.max(0, Math.min(5, value));
  
  // Tamanho das estrelas com base na prop size
  const starSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7"
  };
  
  const starSize = starSizes[size];
  
  // Gerar as 5 estrelas
  const stars = Array.from({ length: 5 }).map((_, index) => {
    const starNumber = index + 1;
    const isFilled = starNumber <= rating;
    
    const handleClick = () => {
      if (readOnly) return;
      
      // Se clicar na mesma estrela que já está selecionada, desmarcar (0 estrelas)
      if (onChange) {
        onChange(rating === starNumber ? 0 : starNumber);
      }
    };
    
    return (
      <button
        key={index}
        type="button"
        onClick={handleClick}
        className={cn(
          "focus:outline-none",
          readOnly ? "cursor-default" : "cursor-pointer",
        )}
        disabled={readOnly}
        tabIndex={readOnly ? -1 : 0}
        aria-label={`Avaliar ${starNumber} de 5 estrelas`}
      >
        <Star 
          className={cn(
            starSize,
            "transition-all",
            isFilled 
              ? "text-yellow-400 fill-yellow-400" 
              : "text-gray-300 hover:text-yellow-200",
            readOnly && "hover:text-gray-300"
          )} 
        />
      </button>
    );
  });
  
  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {stars}
      {!readOnly && (
        <span className="ml-2 text-sm text-muted-foreground">
          {rating > 0 ? `${rating} ${rating === 1 ? 'estrela' : 'estrelas'}` : ''}
        </span>
      )}
    </div>
  );
}