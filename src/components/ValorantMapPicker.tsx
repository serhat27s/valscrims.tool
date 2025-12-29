import { useState, useCallback, useRef, useEffect } from 'react';
import { valorantMaps, ValorantMap } from '@/data/valorantMaps';
import { MapCard } from './MapCard';
import { MapCountSelector } from './MapCountSelector';
import { SelectedMapsDisplay } from './SelectedMapsDisplay';
import { TeamDrawer } from './TeamDrawer';
import { AnimatedBackground } from './AnimatedBackground';
import { ClipboardButton } from './ClipboardButton';
import { Button } from '@/components/ui/button';
import { Shuffle, RotateCcw, Map, Users, Zap, Github } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import confetti from 'canvas-confetti';

export const ValorantMapPicker = () => {
  const [excludedMapsArray, setExcludedMapsArray] = useLocalStorage<string[]>('valorant-excluded-maps', []);
  const [excludedMaps, setExcludedMapsState] = useState<Set<string>>(() => new Set(excludedMapsArray));

  // Only sync to localStorage when excludedMaps changes, not the other way around
  const setExcludedMaps = useCallback((updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setExcludedMapsState(prev => {
      const newSet = updater instanceof Function ? updater(prev) : updater;
      // Sync to localStorage
      setExcludedMapsArray(Array.from(newSet));
      return newSet;
    });
  }, [setExcludedMapsArray]);

  const [selectedCount, setSelectedCount] = useLocalStorage<1 | 3 | 5>('valorant-map-count', 3);
  const [selectedMaps, setSelectedMaps] = useState<ValorantMap[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentMapIndex, setCurrentMapIndex] = useState<number>(-1);
  const [cyclingMap, setCyclingMap] = useState<ValorantMap | null>(null);
  const [revealedMaps, setRevealedMaps] = useState<ValorantMap[]>([]);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  const toggleExclude = useCallback((mapId: string) => {
    if (isAnimating) return;

    setExcludedMaps(prev => {
      const next = new Set(prev);

      if (next.has(mapId)) {
        // Always allow un-excluding a map
        next.delete(mapId);
      } else {
        // Check if we can exclude this map
        const availableMapsAfterExclusion = valorantMaps.length - (next.size + 1);

        if (availableMapsAfterExclusion < selectedCount) {
          toast({
            title: "Cannot exclude map",
            description: `You need at least ${selectedCount} maps for ${selectedCount === 1 ? 'BO1' : selectedCount === 3 ? 'BO3' : 'BO5'}. Currently ${availableMapsAfterExclusion} would remain.`,
            variant: "destructive"
          });
          return prev; // Don't change the state
        }

        next.add(mapId);
      }

      return next;
    });
  }, [isAnimating, selectedCount, toast]);

  const availableMaps = valorantMaps.filter(map => !excludedMaps.has(map.id));

  // Animation for cycling through maps
  const animateMapSelection = useCallback((
    targetMaps: ValorantMap[],
    mapIndex: number,
    onComplete: () => void
  ) => {
    const totalCycles = 15 + Math.floor(Math.random() * 5);
    let currentCycle = 0;
    let cycleIndex = Math.floor(Math.random() * availableMaps.length);

    setCurrentMapIndex(mapIndex);

    const cycle = () => {
      if (currentCycle >= totalCycles) {
        setCyclingMap(targetMaps[mapIndex]);
        setTimeout(() => {
          setRevealedMaps(prev => [...prev, targetMaps[mapIndex]]);
          setCyclingMap(null);
          onComplete();
        }, 600);
        return;
      }

      const progress = currentCycle / totalCycles;
      const baseDelay = 80;
      const maxDelay = 400;
      const delay = baseDelay + (maxDelay - baseDelay) * Math.pow(progress, 2);

      cycleIndex = (cycleIndex + 1) % availableMaps.length;
      setCyclingMap(availableMaps[cycleIndex]);
      currentCycle++;

      animationRef.current = setTimeout(cycle, delay);
    };

    cycle();
  }, [availableMaps]);

  const generateMaps = useCallback(() => {
    if (isAnimating) return;

    if (availableMaps.length < selectedCount) {
      toast({
        title: "Not enough maps",
        description: `You need at least ${selectedCount} maps in the pool. Currently have ${availableMaps.length}.`,
        variant: "destructive"
      });
      return;
    }

    const shuffled = [...availableMaps];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const targetMaps = shuffled.slice(0, selectedCount);

    setIsAnimating(true);
    setSelectedMaps([]);
    setRevealedMaps([]);

    const triggerConfetti = () => {
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#ff4655', '#ffffff', '#0f1923']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#ff4655', '#ffffff', '#0f1923']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff4655', '#ffffff', '#0f1923', '#ff6b7a']
      });

      frame();
    };

    const animateSequentially = (index: number) => {
      if (index >= targetMaps.length) {
        setIsAnimating(false);
        setCurrentMapIndex(-1);
        setSelectedMaps(targetMaps);
        triggerConfetti();
        return;
      }

      animateMapSelection(targetMaps, index, () => {
        setTimeout(() => animateSequentially(index + 1), 500);
      });
    };

    animateSequentially(0);
  }, [availableMaps, selectedCount, toast, isAnimating, animateMapSelection]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  const resetSelection = useCallback(() => {
    if (isAnimating) return;
    setSelectedMaps([]);
    setRevealedMaps([]);
  }, [isAnimating]);

  const resetAll = useCallback(() => {
    if (isAnimating) return;
    setSelectedMaps([]);
    setRevealedMaps([]);
    setExcludedMaps(new Set());
  }, [isAnimating]);

  const selectedMapIds = new Set(selectedMaps.map(m => m.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative border-b border-border/50 bg-gradient-to-b from-card/80 to-background/50 backdrop-blur-sm overflow-hidden">
        <AnimatedBackground />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* GitHub Link - Top Right */}
          <div className="absolute top-4 right-4">
            <a
              href="https://github.com/serhat27s/map-picker-pro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-card/80 border border-border rounded-lg hover:bg-card hover:border-primary/50 transition-all group"
              title="View on GitHub"
            >
              <Github className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          </div>

          <div className="text-center space-y-4">
            {/* Title */}
            <h1 className="valorant-title text-6xl md:text-7xl tracking-wider">
              <span className="text-muted-foreground/60">VALSCRIM</span>
              <span className="text-primary drop-shadow-[0_0_20px_rgba(255,70,85,0.5)]">.TOOLS</span>
            </h1>

            {/* Subtitle */}
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Professional scrim tools for map selection and team generation
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
                <Map className="w-4 h-4 text-primary" />
                <span className="text-base font-medium text-primary">Random Maps</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-base font-medium text-blue-400">Team Generator</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-base font-medium text-purple-400">Instant Draw</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="maps" className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-card/80 border border-border h-12 p-1 relative overflow-hidden">
            <TabsTrigger
              value="maps"
              className="valorant-title tracking-wider text-base flex items-center justify-center transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-sm"
            >
              <Map className="w-4 h-4 mr-2" />
              Map Picker
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="valorant-title tracking-wider text-base flex items-center justify-center transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Team Draw
            </TabsTrigger>
          </TabsList>

          {/* Map Picker Tab */}
          <TabsContent value="maps" className="space-y-8">
            {/* Controls Card */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-2 text-center sm:text-left">
                  <h2 className="valorant-title text-foreground tracking-wider text-2xl">
                    Tournament Format
                  </h2>
                  <p className="text-muted-foreground text-lg my-0 font-thin px-0 py-0 mx-0">
                    Select best-of format and generate random maps
                  </p>
                </div>

                <MapCountSelector selectedCount={selectedCount} onSelect={setSelectedCount} />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                <div className="text-muted-foreground text-lg">
                  Map Pool: <span className="text-primary font-bold">{availableMaps.length}</span> / {valorantMaps.length} maps
                  {excludedMaps.size > 0 && (
                    <button onClick={resetAll} className="ml-3 text-primary hover:underline">
                      Reset exclusions
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={generateMaps}
                    disabled={isAnimating}
                    className="valorant-clip bg-primary hover:bg-primary/90 text-primary-foreground valorant-title text-lg px-8 py-5 tracking-wider disabled:opacity-50"
                  >
                    <Shuffle className={`w-5 h-5 mr-2 ${isAnimating ? 'animate-spin' : ''}`} />
                    {isAnimating ? 'Rolling...' : 'Generate'}
                  </Button>

                  {selectedMaps.length > 0 && !isAnimating && (
                    <Button onClick={resetSelection} variant="secondary" className="valorant-clip valorant-title text-lg px-6 py-5 tracking-wider">
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Reroll
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Map Selection Animation */}
            {isAnimating && (
              <div className="bg-card border border-primary/50 rounded-lg p-6 valorant-glow">
                <h3 className="valorant-title text-xl text-center text-primary mb-6 tracking-wider">
                  Selecting Map {currentMapIndex + 1} of {selectedCount}
                </h3>

                {/* Cycling Map Display */}
                {cyclingMap && (
                  <div className="flex justify-center mb-6">
                    <div className="relative w-64 h-40 rounded-lg overflow-hidden border-2 border-primary shadow-lg shadow-primary/30 animate-pulse">
                      <img
                        src={cyclingMap.image}
                        alt={cyclingMap.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      <div className="absolute bottom-3 left-0 right-0 text-center">
                        <span className="valorant-title text-2xl text-foreground tracking-wider">
                          {cyclingMap.name}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Already Revealed Maps */}
                {revealedMaps.length > 0 && (
                  <div className="border-t border-border pt-4 mt-4">
                    <p className="text-muted-foreground text-sm text-center mb-3">Selected Maps:</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                      {revealedMaps.map((map, idx) => (
                        <div key={map.id} className="relative w-32 h-20 rounded overflow-hidden border border-primary/50">
                          <img src={map.image} alt={map.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
                          <div className="absolute bottom-1 left-0 right-0 text-center">
                            <span className="valorant-title text-xs text-foreground">
                              {idx + 1}. {map.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selected Maps Display */}
            {selectedMaps.length > 0 && !isAnimating && (
              <div className="bg-card border border-primary/30 rounded-lg p-6 valorant-glow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="valorant-title text-xl text-primary tracking-wider">Selected Maps</h3>
                  <ClipboardButton
                    text={selectedMaps.map((m, i) => `${i + 1}. ${m.name}`).join('\n')}
                    label="Copy Maps"
                  />
                </div>
                <SelectedMapsDisplay maps={selectedMaps} />
              </div>
            )}

            {/* Map Grid */}
            <div className="space-y-4">
              <h2 className="valorant-title text-xl text-muted-foreground tracking-wider">
                {selectedMaps.length > 0 ? 'Map Pool' : 'Click maps to exclude them'}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {valorantMaps.map(map => (
                  <MapCard
                    key={map.id}
                    map={map}
                    isExcluded={excludedMaps.has(map.id)}
                    isSelected={selectedMapIds.has(map.id)}
                    onToggleExclude={toggleExclude}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Team Draw Tab */}
          <TabsContent value="teams">
            <div className="bg-card border border-border rounded-lg p-6 max-w-2xl mx-auto">
              <TeamDrawer />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center space-y-2">
          <p className="text-muted-foreground text-base">
            Made for VALORANT custom games • Not affiliated with Riot Games
          </p>
          <p className="text-muted-foreground text-sm">
            Created by{' '}
            <a
              href="https://github.com/YOUR_GITHUB_USERNAME"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              @YOUR_GITHUB_USERNAME
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};
