import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Shuffle, Plus, X, Zap, Target, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ClipboardButton } from './ClipboardButton';
import confetti from 'canvas-confetti';

const MAX_PLAYERS = 10; // 5 per team

interface TeamDrawerProps {
  onTeamsGenerated?: (team1: string[], team2: string[]) => void;
}

export const TeamDrawer = ({ onTeamsGenerated }: TeamDrawerProps) => {
  const [players, setPlayers] = useLocalStorage<string[]>('valorant-players', []);
  const [inputValue, setInputValue] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [team1, setTeam1] = useState<string[]>([]);
  const [team2, setTeam2] = useState<string[]>([]);
  const [isDrawn, setIsDrawn] = useState(false);
  const [drawMode, setDrawMode] = useState<'instant' | 'wheel'>('instant');

  // Wheel animation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [assignedPlayers, setAssignedPlayers] = useState<Map<string, 1 | 2>>(new Map());
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Side selection state
  const [attackingTeam, setAttackingTeam] = useState<1 | 2 | null>(null);
  const [isSideSpinning, setIsSideSpinning] = useState(false);
  const [sideHighlight, setSideHighlight] = useState<1 | 2>(1);
  const [sideDrawMode, setSideDrawMode] = useState<'attack' | 'defense'>('attack'); // New: which side to draw for

  const canAddMore = players.length < MAX_PLAYERS;

  const addPlayer = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !players.includes(trimmed) && canAddMore) {
      setPlayers(prev => [...prev, trimmed]);
      setInputValue('');
      setIsDrawn(false);
    }
  }, [inputValue, players, canAddMore]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPlayer();
    }
  };

  const addBulkPlayers = useCallback(() => {
    const names = bulkInput
      .split('\n')
      .map(name => name.trim())
      .filter(name => name && !players.includes(name));

    const slotsLeft = MAX_PLAYERS - players.length;
    const namesToAdd = names.slice(0, slotsLeft);

    if (namesToAdd.length > 0) {
      setPlayers(prev => [...prev, ...namesToAdd]);
      setBulkInput('');
      setBulkMode(false);
      setIsDrawn(false);
    }
  }, [bulkInput, players]);

  const removePlayer = useCallback((player: string) => {
    setPlayers(prev => prev.filter(p => p !== player));
    setIsDrawn(false);
    setAssignedPlayers(new Map());
    setAttackingTeam(null);
  }, []);

  const shuffleArray = (arr: string[]) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const triggerConfetti = useCallback(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#ff4655', '#3b82f6', '#ffffff', '#f59e0b']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#ff4655', '#3b82f6', '#ffffff', '#f59e0b']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff4655', '#3b82f6', '#ffffff', '#f59e0b']
    });

    frame();
  }, []);

  const instantDraw = useCallback(() => {
    if (players.length < 2) return;

    const shuffled = shuffleArray(players);
    const mid = Math.ceil(shuffled.length / 2);
    const newTeam1 = shuffled.slice(0, mid);
    const newTeam2 = shuffled.slice(mid);

    setTeam1(newTeam1);
    setTeam2(newTeam2);
    setIsDrawn(true);
    setAttackingTeam(null);
    onTeamsGenerated?.(newTeam1, newTeam2);
    triggerConfetti();
  }, [players, onTeamsGenerated, triggerConfetti]);

  // Wheel spinning state
  const [wheelRotation, setWheelRotation] = useState(0);
  const [currentSpinningPlayer, setCurrentSpinningPlayer] = useState<string | null>(null);
  const [unassignedPlayers, setUnassignedPlayers] = useState<string[]>([]);
  const isPausedRef = useRef(false);

  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const newValue = !prev;
      isPausedRef.current = newValue;
      return newValue;
    });
  }, []);

  const wheelDraw = useCallback(() => {
    if (players.length < 2 || isSpinning) return;

    setIsSpinning(true);
    setAssignedPlayers(new Map());
    setTeam1([]);
    setTeam2([]);
    setIsDrawn(false);
    setAttackingTeam(null);
    setWheelRotation(0); // Reset to 0 at the very start

    const shuffled = shuffleArray(players);
    setUnassignedPlayers([...shuffled]);
    let currentIndex = 0;
    const team1Temp: string[] = [];
    const team2Temp: string[] = [];
    const assigned = new Map<string, 1 | 2>();

    const spinForPlayer = () => {
      if (currentIndex >= shuffled.length) {
        setIsSpinning(false);
        setCurrentSpinningPlayer(null);
        setTeam1(team1Temp);
        setTeam2(team2Temp);
        setIsDrawn(true);
        onTeamsGenerated?.(team1Temp, team2Temp);
        triggerConfetti();
        return;
      }

      const remainingPlayers = shuffled.filter(p => !assigned.has(p));
      setUnassignedPlayers(remainingPlayers);

      // Calculate how many full rotations + landing position
      const fullRotations = 3 + Math.floor(Math.random() * 2); // 3-4 full spins
      const targetIndex = Math.floor(Math.random() * remainingPlayers.length);
      const segmentAngle = 360 / remainingPlayers.length;

      // Offset to land in the CENTER of the segment (add half segment angle)
      // Start from current wheel position to avoid lag
      const startRotation = wheelRotation;
      const additionalRotation = (fullRotations * 360) + (targetIndex * segmentAngle) + (segmentAngle / 2);
      const targetRotation = startRotation + additionalRotation;

      let currentRotation = startRotation;
      const totalSteps = 40 + Math.floor(Math.random() * 20);
      let step = 0;

      const doSpin = () => {
        step++;
        const progress = step / totalSteps;
        // Ease-out cubic for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentRotation = startRotation + (additionalRotation * easeOut);

        setWheelRotation(currentRotation);

        // Calculate which player is at top (0 degrees) based on rotation
        const normalizedRotation = (360 - (currentRotation % 360)) % 360;
        const highlightIndex = Math.floor(normalizedRotation / segmentAngle) % remainingPlayers.length;
        setCurrentSpinningPlayer(remainingPlayers[highlightIndex]);

        if (step >= totalSteps) {
          // Final selection - the player at the top
          const finalRotation = currentRotation % 360;
          const finalNormalizedRotation = (360 - finalRotation) % 360;
          const finalIndex = Math.floor(finalNormalizedRotation / segmentAngle) % remainingPlayers.length;
          const player = remainingPlayers[finalIndex];

          setCurrentSpinningPlayer(player);
          const team: 1 | 2 = team1Temp.length <= team2Temp.length ? 1 : 2;

          if (team === 1) {
            team1Temp.push(player);
          } else {
            team2Temp.push(player);
          }

          assigned.set(player, team);
          setAssignedPlayers(new Map(assigned));

          currentIndex++;

          // Pause before next player spin - DON'T reset rotation to avoid lag
          setTimeout(() => {
            setCurrentSpinningPlayer(null);
            // Keep the current rotation, just continue from there
            setTimeout(spinForPlayer, 600);
          }, 1200);
        } else {
          // Variable timing - faster at start, slower near end
          const delay = 30 + (progress * progress * 120);

          // Check if paused before scheduling next step
          const checkAndContinue = () => {
            if (isPausedRef.current) {
              // Check again in 100ms if still paused
              spinIntervalRef.current = setTimeout(checkAndContinue, 100);
            } else {
              doSpin();
            }
          };

          spinIntervalRef.current = setTimeout(checkAndContinue, delay);
        }
      };

      doSpin();
    };

    spinForPlayer();
  }, [players, isSpinning, onTeamsGenerated, triggerConfetti]);

  const drawTeams = drawMode === 'instant' ? instantDraw : wheelDraw;

  const drawSide = useCallback(() => {
    if (!isDrawn || isSideSpinning) return;

    setIsSideSpinning(true);
    setAttackingTeam(null);

    let step = 0;
    const totalSteps = 15 + Math.floor(Math.random() * 5); // Reduced from 30-40 to 15-20
    const winner = Math.random() < 0.5 ? 1 : 2;

    const doStep = () => {
      setSideHighlight(prev => prev === 1 ? 2 : 1);
      step++;

      if (step >= totalSteps) {
        // Ensure we land on winner
        setSideHighlight(winner as 1 | 2);

        // Dramatic pause before reveal
        // Final reveal with confetti
        setAttackingTeam(winner);
        setIsSideSpinning(false);

        // Triple confetti burst
        setTimeout(() => {
          const colors = winner === 1 ? ['#ff4655', '#ffffff'] : ['#4d9fff', '#ffffff'];

          // Center burst
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 0.5, y: 0.6 },
            colors: colors
          });
          // Left burst
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: colors
          });
          // Right burst
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: colors
          });
        }, 100);
      } else {
        // Cubic ease-out for smoother deceleration
        const progress = step / totalSteps;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const delay = 40 + (easeOut * 300); // Reduced from 60 + 500 to 40 + 300
        setTimeout(doStep, delay);
      }
    };

    doStep();
  }, [isDrawn, isSideSpinning]);

  const resetAll = useCallback(() => {
    setPlayers([]);
    setTeam1([]);
    setTeam2([]);
    setIsDrawn(false);
    setInputValue('');
    setBulkInput('');
    setAssignedPlayers(new Map());
    setAttackingTeam(null);
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="valorant-title text-2xl text-foreground tracking-wider">
          Random <span className="text-primary">Team Generator</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          Add up to {MAX_PLAYERS} players (5 per team)
        </p>
        {players.length > 0 && (
          <p className="text-sm text-muted-foreground">
            💾 Player list auto-saved
          </p>
        )}
      </div>

      {/* Draw Mode Toggle */}
      <div className="flex justify-center gap-2">
        <Button
          onClick={() => setDrawMode('instant')}
          variant={drawMode === 'instant' ? 'default' : 'secondary'}
          className={cn('valorant-clip text-base', drawMode === 'instant' && 'bg-primary text-primary-foreground')}
        >
          <Zap className="w-4 h-4 mr-2" />
          Instant Draw
        </Button>
        <Button
          onClick={() => setDrawMode('wheel')}
          variant={drawMode === 'wheel' ? 'default' : 'secondary'}
          className={cn('valorant-clip text-base', drawMode === 'wheel' && 'bg-primary text-primary-foreground')}
        >
          <Shuffle className="w-4 h-4 mr-2" />
          Wheel Spin
        </Button>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        {bulkMode ? (
          <div className="space-y-3">
            <Textarea
              placeholder={`Paste player names here(one per line, max ${MAX_PLAYERS - players.length} more)...`}
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              className="min-h-[120px] bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <Button onClick={addBulkPlayers} className="valorant-clip bg-primary hover:bg-primary/90 text-primary-foreground">
                Add Players
              </Button>
              <Button onClick={() => setBulkMode(false)} variant="secondary" className="valorant-clip">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder={canAddMore ? "Enter player name..." : "Max players reached"}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!canAddMore}
              className="bg-card border-border text-foreground placeholder:text-muted-foreground text-base"
            />
            <Button
              onClick={addPlayer}
              disabled={!canAddMore}
              className="valorant-clip bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setBulkMode(true)}
              disabled={!canAddMore}
              variant="secondary"
              className="valorant-clip text-base"
            >
              Bulk Add
            </Button>
          </div>
        )}
      </div>

      {/* Wheel Spinner Visual */}
      {drawMode === 'wheel' && isSpinning && unassignedPlayers.length > 0 && (
        <div className="flex flex-col items-center space-y-6 py-8">
          {/* Special case: Only one player left */}
          {unassignedPlayers.length === 1 ? (
            <div className="text-center space-y-6">
              <div className="bg-card border-4 border-primary rounded-lg p-12 valorant-glow">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-4">Last Player</p>
                <p className="text-5xl text-primary font-bold valorant-title tracking-wider">
                  {unassignedPlayers[0]}
                </p>
                <p className="text-muted-foreground mt-4">
                  Automatically assigned to Team {team1.length <= team2.length ? 1 : 2}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Pause/Resume Button */}
              <Button
                onClick={togglePause}
                variant={isPaused ? "default" : "secondary"}
                className={cn(
                  "valorant-clip text-lg px-6 py-6",
                  isPaused && "bg-yellow-500 hover:bg-yellow-600 text-black animate-pulse"
                )}
              >
                {isPaused ? (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    RESUME DRAFT
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>

              <div className="relative w-80 h-80">
                {/* Pause Overlay */}
                {isPaused && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-full border-4 border-yellow-400 animate-pulse">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 mx-auto bg-yellow-400 rounded-full flex items-center justify-center">
                        <div className="flex gap-2">
                          <div className="w-3 h-12 bg-black rounded"></div>
                          <div className="w-3 h-12 bg-black rounded"></div>
                        </div>
                      </div>
                      <p className="text-2xl font-bold valorant-title text-yellow-400 tracking-wider">
                        PAUSED
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Click RESUME to continue
                      </p>
                    </div>
                  </div>
                )}

                {/* Spinning wheel */}
                <svg
                  className={cn(
                    "absolute inset-0 w-full h-full transition-opacity duration-300",
                    isPaused && "opacity-30"
                  )}
                  viewBox="0 0 200 200"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: 'transform 0.05s linear'
                  }}
                >
                  {/* Wheel segments */}
                  {unassignedPlayers.map((player, index) => {
                    const segmentAngle = 360 / unassignedPlayers.length;
                    const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
                    const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
                    const midAngle = (startAngle + endAngle) / 2;
                    const isHighlighted = currentSpinningPlayer === player;

                    // Alternate colors for segments
                    const colors = [
                      '#ff4655',
                      '#3b82f6',
                      '#9333ea',
                      '#ec4899',
                      '#f97316',
                    ];
                    const color = colors[index % colors.length];

                    // Calculate path for pie slice
                    const x1 = 100 + 100 * Math.cos(startAngle);
                    const y1 = 100 + 100 * Math.sin(startAngle);
                    const x2 = 100 + 100 * Math.cos(endAngle);
                    const y2 = 100 + 100 * Math.sin(endAngle);

                    // Text position (60% from center)
                    const textX = 100 + 60 * Math.cos(midAngle);
                    const textY = 100 + 60 * Math.sin(midAngle);
                    const textRotation = ((index * segmentAngle) + segmentAngle / 2);

                    return (
                      <g key={player}>
                        {/* Segment */}
                        <path
                          d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${segmentAngle > 180 ? 1 : 0} 1 ${x2} ${y2} Z`}
                          fill={color}
                          opacity={isHighlighted ? 1 : 0.8}
                          stroke="#0a0a0a"
                          strokeWidth="1"
                        />

                        {/* Player name */}
                        <text
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={isHighlighted ? "#fde047" : "#ffffff"}
                          fontSize={isHighlighted ? "10" : "8"}
                          fontWeight="bold"
                          transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                          style={{
                            filter: isHighlighted ? 'drop-shadow(0 0 4px rgba(253, 224, 71, 0.8))' : 'none',
                            fontFamily: 'Bebas Neue, sans-serif',
                            letterSpacing: '0.05em'
                          }}
                        >
                          {player}
                        </text>
                      </g>
                    );
                  })}

                  {/* Center circle */}
                  <circle cx="100" cy="100" r="20" fill="#0a0a0a" stroke="#ff4655" strokeWidth="3" />
                </svg>

                {/* Shuffle icon in center */}
                <div className={cn(
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300",
                  isPaused && "opacity-30"
                )}>
                  <Shuffle className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '2s' }} />
                </div>

                {/* Pointer arrow at top */}
                <div className={cn(
                  "absolute -top-4 left-1/2 -translate-x-1/2 z-30 transition-opacity duration-300",
                  isPaused && "opacity-30"
                )}>
                  <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
                </div>

                {/* Outer border ring */}
                <div className={cn(
                  "absolute inset-0 rounded-full border-8 border-primary pointer-events-none transition-opacity duration-300",
                  isPaused && "opacity-30"
                )} />

                {/* Outer glow ring */}
                <div className={cn(
                  "absolute inset-0 rounded-full border-4 border-yellow-400/30 animate-pulse pointer-events-none transition-opacity duration-300",
                  isPaused && "opacity-30"
                )}
                  style={{ transform: 'scale(1.05)' }} />
              </div>

              {/* Current selection indicator */}
              {currentSpinningPlayer && !isPaused && (
                <div className="text-center space-y-2 animate-pulse">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">Selecting...</p>
                  <p className="text-3xl text-yellow-400 font-bold valorant-title tracking-wider drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]">
                    {currentSpinningPlayer}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Live Draft Table */}
          {assignedPlayers.size > 0 && (
            <div className="w-full max-w-2xl">
              <h3 className="text-center text-lg valorant-title text-muted-foreground mb-3 tracking-wider">
                DRAFT BOARD
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Team 1 */}
                <div className="bg-card border-2 border-primary/50 rounded-lg p-4">
                  <h4 className="text-center text-xl valorant-title text-primary mb-3 tracking-wider">
                    TEAM 1
                  </h4>
                  <div className="space-y-2">
                    {Array.from(assignedPlayers.entries())
                      .filter(([_, team]) => team === 1)
                      .map(([player], index) => (
                        <div
                          key={player}
                          className="bg-primary/10 border border-primary/30 rounded px-3 py-2 text-center"
                          style={{
                            animation: `slideIn 0.3s ease-out ${index * 0.1}s backwards`
                          }}
                        >
                          <span className="text-foreground font-medium">{player}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Team 2 */}
                <div className="bg-card border-2 border-blue-500/50 rounded-lg p-4">
                  <h4 className="text-center text-xl valorant-title text-blue-400 mb-3 tracking-wider">
                    TEAM 2
                  </h4>
                  <div className="space-y-2">
                    {Array.from(assignedPlayers.entries())
                      .filter(([_, team]) => team === 2)
                      .map(([player], index) => (
                        <div
                          key={player}
                          className="bg-blue-500/10 border border-blue-500/30 rounded px-3 py-2 text-center"
                          style={{
                            animation: `slideIn 0.3s ease-out ${index * 0.1}s backwards`
                          }}
                        >
                          <span className="text-foreground font-medium">{player}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          <div className="text-center">
            <p className="text-base text-muted-foreground">
              Player {assignedPlayers.size + 1} of {players.length}
            </p>
          </div>
        </div>
      )}

      {/* Player List - Only show when NOT spinning in wheel mode */}
      {players.length > 0 && !(drawMode === 'wheel' && isSpinning) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-lg antialiased">
              Players: <span className="text-primary font-bold">{players.length}/{MAX_PLAYERS}</span>
            </span>
            <button onClick={resetAll} className="text-base text-primary hover:underline antialiased">
              Clear all
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {players.map((player) => {
              const assignedTeam = assignedPlayers.get(player);
              const isHighlighted = currentSpinningPlayer === player;

              return (
                <div
                  key={player}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded transition-all duration-150',
                    assignedTeam === 1 && 'bg-primary/20 border border-primary',
                    assignedTeam === 2 && 'bg-blue-500/20 border border-blue-500',
                    !assignedTeam && 'bg-card border border-border',
                    isHighlighted && 'ring-2 ring-yellow-400 scale-110 bg-yellow-400/20'
                  )}
                >
                  <span className="text-foreground text-sm">{player}</span>
                  {!isSpinning && (
                    <button onClick={() => removePlayer(player)} className="text-muted-foreground hover:text-primary transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Draw Button */}
      {players.length >= 2 && (
        <Button
          onClick={drawTeams}
          disabled={isSpinning}
          className="w-full valorant-clip bg-primary hover:bg-primary/90 text-primary-foreground valorant-title text-lg py-6 tracking-wider"
        >
          {drawMode === 'instant' ? <Zap className="w-5 h-5 mr-2" /> : <Shuffle className="w-5 h-5 mr-2" />}
          {isSpinning ? 'Drawing...' : isDrawn ? 'Redraw Teams' : 'Draw Teams'}
        </Button>
      )}

      {/* Teams Display */}
      {isDrawn && (
        <div className="space-y-6">
          {/* Copy Teams Button */}
          <div className="flex justify-center">
            <ClipboardButton
              text={`** Team 1 ** ${attackingTeam === 1 ? '(Attack)' : attackingTeam === 2 ? '(Defense)' : ''} \n${team1.map(p => `• ${p}`).join('\n')} \n\n ** Team 2 ** ${attackingTeam === 2 ? '(Attack)' : attackingTeam === 1 ? '(Defense)' : ''} \n${team2.map(p => `• ${p}`).join('\n')} `}
              label="Copy Teams (Discord Format)"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className={cn(
                'valorant-title text-lg tracking-wider text-center transition-all flex items-center justify-center gap-2',
                attackingTeam === 1 ? 'text-orange-500' : 'text-primary'
              )}>
                Team 1 {attackingTeam === 1 && (
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4 animate-pulse" />
                    (T)
                  </span>
                )}
              </h3>
              <div className={cn(
                'bg-card border rounded p-4 space-y-2 transition-all duration-300 relative overflow-hidden',
                // Spinning state
                isSideSpinning && sideHighlight === 1 && 'ring-4 ring-yellow-400 scale-105 shadow-2xl shadow-yellow-400/50',
                isSideSpinning && sideHighlight !== 1 && 'opacity-50 scale-95',
                // Winner state
                !isSideSpinning && attackingTeam === 1 && 'ring-4 ring-orange-500 scale-105 shadow-2xl shadow-orange-500/50 animate-[wiggle_0.5s_ease-in-out]',
                // Default state
                attackingTeam === 1 ? 'border-orange-500/50' : 'border-primary/30'
              )}>
                {/* Side Badge */}
                {attackingTeam === 1 && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-black px-3 py-1 rounded-full text-xs font-bold valorant-title tracking-wider flex items-center gap-1 shadow-lg">
                    <Flame className="w-3 h-3" />
                    ATTACK
                  </div>
                )}
                {attackingTeam === 2 && (
                  <div className="absolute top-2 right-2 bg-cyan-400 text-black px-3 py-1 rounded-full text-xs font-bold valorant-title tracking-wider shadow-lg">
                    DEFENSE
                  </div>
                )}

                {team1.map(player => (
                  <div key={player} className="text-foreground text-center py-1 border-b border-border last:border-0">
                    {player}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className={cn(
                'valorant-title text-lg tracking-wider text-center transition-all flex items-center justify-center gap-2',
                attackingTeam === 2 ? 'text-orange-500' : 'text-blue-400'
              )}>
                Team 2 {attackingTeam === 2 && (
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4 animate-pulse" />
                    (T)
                  </span>
                )}
              </h3>
              <div className={cn(
                'bg-card border rounded p-4 space-y-2 transition-all duration-300 relative overflow-hidden',
                // Spinning state
                isSideSpinning && sideHighlight === 2 && 'ring-4 ring-yellow-400 scale-105 shadow-2xl shadow-yellow-400/50',
                isSideSpinning && sideHighlight !== 2 && 'opacity-50 scale-95',
                // Winner state
                !isSideSpinning && attackingTeam === 2 && 'ring-4 ring-orange-500 scale-105 shadow-2xl shadow-orange-500/50 animate-[wiggle_0.5s_ease-in-out]',
                // Default state
                attackingTeam === 2 ? 'border-orange-500/50' : 'border-blue-500/30'
              )}>
                {/* Side Badge */}
                {attackingTeam === 2 && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-black px-3 py-1 rounded-full text-xs font-bold valorant-title tracking-wider flex items-center gap-1 shadow-lg">
                    <Flame className="w-3 h-3" />
                    ATTACK
                  </div>
                )}
                {attackingTeam === 1 && (
                  <div className="absolute top-2 right-2 bg-cyan-400 text-black px-3 py-1 rounded-full text-xs font-bold valorant-title tracking-wider shadow-lg">
                    DEFENSE
                  </div>
                )}

                {team2.map(player => (
                  <div key={player} className="text-foreground text-center py-1 border-b border-border last:border-0">
                    {player}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side Selection */}
          <div className="text-center space-y-3">
            {/* Toggle for Attack/Defense */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="inline-flex rounded-lg border border-border p-1 bg-card">
                <button
                  onClick={() => setSideDrawMode('attack')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium valorant-title tracking-wider transition-all flex items-center gap-1.5",
                    sideDrawMode === 'attack'
                      ? "bg-orange-500 text-black shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Flame className="w-3.5 h-3.5" />
                  ATTACK (T)
                </button>
                <button
                  onClick={() => setSideDrawMode('defense')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium valorant-title tracking-wider transition-all",
                    sideDrawMode === 'defense'
                      ? "bg-cyan-400 text-black shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  DEFENSE (CT)
                </button>
              </div>
            </div>

            <Button
              onClick={drawSide}
              disabled={isSideSpinning}
              variant="secondary"
              className="valorant-clip text-base"
            >
              <Target className="w-4 h-4 mr-2" />
              {isSideSpinning ? 'Drawing side...' : attackingTeam ? 'Redraw Side' : `Draw ${sideDrawMode === 'attack' ? 'Attacker' : 'Defender'} Side`}
            </Button>

            {attackingTeam && !isSideSpinning && (
              <div className="text-muted-foreground text-base">
                {sideDrawMode === 'attack' ? (
                  <>
                    <span className="text-orange-500 font-bold">Team {attackingTeam}</span> starts on{' '}
                    <span className="text-orange-500 font-bold">Attack (T)</span>
                    {' • '}
                    <span className="text-cyan-400 font-bold">Team {attackingTeam === 1 ? 2 : 1}</span> starts on{' '}
                    <span className="text-cyan-400 font-bold">Defense (CT)</span>
                  </>
                ) : (
                  <>
                    <span className="text-cyan-400 font-bold">Team {attackingTeam === 1 ? 2 : 1}</span> starts on{' '}
                    <span className="text-orange-500 font-bold">Attack (T)</span>
                    {' • '}
                    <span className="text-cyan-400 font-bold">Team {attackingTeam}</span> starts on{' '}
                    <span className="text-cyan-400 font-bold">Defense (CT)</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
