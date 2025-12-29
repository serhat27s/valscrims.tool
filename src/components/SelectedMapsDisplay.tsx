import { ValorantMap } from '@/data/valorantMaps';
import { cn } from '@/lib/utils';

interface SelectedMapsDisplayProps {
  maps: ValorantMap[];
}

export const SelectedMapsDisplay = ({ maps }: SelectedMapsDisplayProps) => {
  if (maps.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="valorant-title text-3xl text-center text-primary tracking-widest">
        Selected Maps
      </h2>
      
      <div className={cn(
        "grid gap-6",
        maps.length === 1 && "grid-cols-1 max-w-md mx-auto",
        maps.length === 3 && "grid-cols-1 md:grid-cols-3",
        maps.length === 5 && "grid-cols-1 md:grid-cols-3 lg:grid-cols-5"
      )}>
        {maps.map((map, index) => (
          <div
            key={map.id}
            className="animate-fade-in valorant-clip valorant-glow overflow-hidden"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="relative aspect-video bg-card overflow-hidden">
              <img
                src={map.image}
                alt={map.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://placehold.co/400x225/1a1a1a/ff4655?text=${map.name}`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              
              {/* Map number badge */}
              <div className="absolute top-3 left-3 bg-primary text-primary-foreground valorant-title text-xl w-8 h-8 flex items-center justify-center valorant-clip">
                {index + 1}
              </div>
              
              {/* Map name */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="valorant-title text-2xl text-foreground tracking-wider text-center">
                  {map.name}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
