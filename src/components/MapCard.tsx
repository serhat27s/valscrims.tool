import { ValorantMap } from '@/data/valorantMaps';
import { cn } from '@/lib/utils';
import { X, Trophy } from 'lucide-react';

interface MapCardProps {
  map: ValorantMap;
  isExcluded: boolean;
  isSelected: boolean;
  onToggleExclude: (mapId: string) => void;
  disabled?: boolean;
}

export const MapCard = ({ map, isExcluded, isSelected, onToggleExclude, disabled }: MapCardProps) => {
  return (
    <div
      onClick={() => !disabled && onToggleExclude(map.id)}
      className={cn(
        "relative group cursor-pointer transition-all duration-500 valorant-clip overflow-hidden",
        "hover:scale-105",
        !isExcluded && !disabled && "hover:valorant-glow-strong",
        isExcluded && "opacity-50",
        isSelected && "ring-4 ring-primary valorant-glow scale-105",
        disabled && "cursor-default"
      )}
    >
      {/* Map Image */}
      <div className="aspect-video bg-card overflow-hidden">
        <img
          src={map.image}
          alt={map.name}
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            !isExcluded && !disabled && "group-hover:scale-125 group-hover:brightness-110",
            isExcluded && "grayscale blur-sm"
          )}
          onError={(e) => {
            e.currentTarget.src = `https://placehold.co/400x225/1a1a1a/ff4655?text=${map.name}`;
          }}
        />
      </div>

      {/* Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent",
        "flex items-end justify-between p-3 transition-all duration-300",
        !isExcluded && !disabled && "group-hover:from-primary/20 group-hover:via-background/30"
      )}>
        <span className={cn(
          "valorant-title text-xl font-bold tracking-wider transition-all duration-300",
          isSelected ? "text-primary" : "text-foreground",
          !isExcluded && !disabled && "group-hover:text-primary group-hover:scale-110"
        )}>
          {map.name}
        </span>

        {isSelected && (
          <div className="bg-primary rounded-full p-2 animate-pulse-glow">
            <Trophy className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Excluded Overlay with red tint */}
      {isExcluded && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/30 backdrop-blur-sm">
          <div className="bg-destructive rounded-full p-3 shadow-lg">
            <X className="w-8 h-8 text-destructive-foreground" />
          </div>
        </div>
      )}

      {/* Hover indicator */}
      {!disabled && !isExcluded && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
          <span className="text-sm text-foreground bg-primary/90 px-3 py-1.5 rounded valorant-clip font-bold">
            EXCLUDE
          </span>
        </div>
      )}

      {!disabled && isExcluded && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
          <span className="text-sm text-foreground bg-primary/90 px-3 py-1.5 rounded valorant-clip font-bold">
            INCLUDE
          </span>
        </div>
      )}

      {/* Hover glow effect */}
      {!disabled && !isExcluded && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
        </div>
      )}
    </div>
  );
};
