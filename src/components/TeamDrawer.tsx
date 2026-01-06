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
  const [isResuming, setIsResuming] = useState(false);
  const [assignedPlayers, setAssignedPlayers] = useState<Map<string, 1 | 2>>(new Map());
  const [currentSpinDuration, setCurrentSpinDuration] = useState(3000); // Track current spin duration
  const spinIntervalRef = useRef<number | null>(null);

  // Pause timing refs
  const pauseStartTimeRef = useRef<number | null>(null);
  const totalPausedTimeRef = useRef<number>(0);

  // Wheel animation tracking refs
  const wheelRef = useRef<SVGSVGElement>(null);
  const pausedRotationRef = useRef<number | null>(null);
  const spinStartRotationRef = useRef<number>(0);
  const spinTargetRotationRef = useRef<number>(0);
  const spinStartTimeRef = useRef<number>(0);

  // Coin toss state
  const [coinTossPhase, setCoinTossPhase] = useState<'choose' | 'flipping' | 'result' | 'complete' | null>(null);
  const [team1Choice, setTeam1Choice] = useState<'heads' | 'tails' | null>(null);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [coinWinner, setCoinWinner] = useState<1 | 2 | null>(null);

  const [attackingTeam, setAttackingTeam] = useState<1 | 2 | null>(null);

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
  const [wheelOpacity, setWheelOpacity] = useState(1); // For fade transitions
  const [currentSpinningPlayer, setCurrentSpinningPlayer] = useState<string | null>(null);
  const [unassignedPlayers, setUnassignedPlayers] = useState<string[]>([]);
  const isPausedRef = useRef(false);

  const togglePause = useCallback(() => {
    if (isPaused) {
      // Resuming
      if (pauseStartTimeRef.current !== null) {
        totalPausedTimeRef.current += Date.now() - pauseStartTimeRef.current;
        pauseStartTimeRef.current = null;
      }
      setIsPaused(false);
      isPausedRef.current = false;
    } else {
      // Pausing
      pauseStartTimeRef.current = Date.now();
      setIsPaused(true);
      isPausedRef.current = true;
    }
  }, [isPaused]);

  const wheelDraw = useCallback(() => {
    if (players.length < 2 || isSpinning) return;

    setIsSpinning(true);
    setAssignedPlayers(new Map());
    setTeam1([]);
    setTeam2([]);
    setIsDrawn(false);
    setAttackingTeam(null);
    setIsPaused(false);
    isPausedRef.current = false;
    pauseStartTimeRef.current = null;
    totalPausedTimeRef.current = 0;
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
      const fullRotations = 5 + Math.floor(Math.random() * 3); // 5-7 full spins for more drama
      const targetIndex = Math.floor(Math.random() * remainingPlayers.length);
      const segmentAngle = 360 / remainingPlayers.length;

      // Add random offset within 30-70% of segment to avoid edges but look random
      const randomOffset = 0.3 + (Math.random() * 0.4); // Random between 0.3 and 0.7
      const startRotation = wheelRotation;
      const additionalRotation = (fullRotations * 360) + (targetIndex * segmentAngle) + (segmentAngle * randomOffset);
      const targetRotation = startRotation + additionalRotation;

      // Random spin duration between 3-5 seconds
      const spinDuration = 3000 + Math.floor(Math.random() * 2000);

      // Set refs for this spin
      setCurrentSpinDuration(spinDuration);
      spinStartRotationRef.current = startRotation;
      spinTargetRotationRef.current = targetRotation;
      spinStartTimeRef.current = Date.now();
      totalPausedTimeRef.current = 0;

      // JavaScript-driven animation loop
      let animationFrameId: number;

      const animate = () => {
        // If paused, don't update rotation, just keep loop alive
        if (isPausedRef.current) {
          animationFrameId = requestAnimationFrame(animate);
          return;
        }

        // Calculate elapsed time, accounting for any time spent paused
        const now = Date.now();
        const rawElapsed = now - spinStartTimeRef.current;
        const elapsed = rawElapsed - totalPausedTimeRef.current;
        const progress = Math.min(elapsed / spinDuration, 1);

        // Cubic bezier easing - ease out
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentRotation = startRotation + (additionalRotation * easeOut);
        setWheelRotation(currentRotation);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          // Spin complete - finalize selection
          const finalRotation = targetRotation % 360;
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

          // Step 1: Show the selected player for 800ms
          setTimeout(() => {
            // Step 2: Remove selected player from wheel
            const updatedRemainingPlayers = remainingPlayers.filter(p => p !== player);
            setUnassignedPlayers(updatedRemainingPlayers);

            // After removing a segment, adjust wheel so arrow points at CENTER of nearest segment
            if (updatedRemainingPlayers.length > 0) {
              const newSegmentAngle = 360 / updatedRemainingPlayers.length;
              const currentRot = targetRotation % 360;
              const normalizedRot = (360 - currentRot) % 360;
              const nearestSegmentIndex = Math.round(normalizedRot / newSegmentAngle) % updatedRemainingPlayers.length;
              const adjustedRotation = (360 - (nearestSegmentIndex * newSegmentAngle)) % 360;
              setWheelRotation(adjustedRotation);
            }

            // Step 3: Wait 600ms, then clear highlight and start next spin
            setTimeout(() => {
              setCurrentSpinningPlayer(null);
              setTimeout(spinForPlayer, 300);
            }, 600);
          }, 800);
        }
      };

      // Start the animation
      animationFrameId = requestAnimationFrame(animate);

      // Store cleanup reference
      spinIntervalRef.current = animationFrameId as unknown as number;
    };

    spinForPlayer();
  }, [players, isSpinning, onTeamsGenerated, triggerConfetti, wheelRotation]);

  const drawTeams = drawMode === 'instant' ? instantDraw : wheelDraw;

  // Coin toss functions
  const startCoinToss = useCallback(() => {
    if (!isDrawn || coinTossPhase) return;
    setCoinTossPhase('choose');
  }, [isDrawn, coinTossPhase]);

  const handleTeam1Choice = useCallback((choice: 'heads' | 'tails') => {
    setTeam1Choice(choice);
    setCoinTossPhase('flipping');

    // Animate coin flip for 3-4 seconds
    const flipDuration = 3000 + Math.floor(Math.random() * 1000);

    // Determine result randomly
    const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';

    setTimeout(() => {
      setCoinResult(result);

      // Determine winner
      const winner = result === choice ? 1 : 2;
      setCoinWinner(winner);
      setCoinTossPhase('result');

      // Show confetti for winner
      setTimeout(() => {
        const colors = winner === 1 ? ['#ff4655', '#ffffff'] : ['#4d9fff', '#ffffff'];
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.5, y: 0.6 },
          colors: colors
        });
      }, 100);
    }, flipDuration);
  }, []);

  const handleSideSelection = useCallback((side: 'attack' | 'defense') => {
    if (!coinWinner) return;

    // Set attacking team based on winner's choice
    if (side === 'attack') {
      setAttackingTeam(coinWinner);
    } else {
      setAttackingTeam(coinWinner === 1 ? 2 : 1);
    }

    setCoinTossPhase('complete');

    // Confetti for side selection
    setTimeout(() => {
      const colors = coinWinner === 1 ? ['#ff4655', '#ffffff'] : ['#4d9fff', '#ffffff'];
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { x: 0.5, y: 0.6 },
        colors: colors
      });
    }, 100);
  }, [coinWinner]);

  const resetAll = useCallback(() => {
    setPlayers([]);
    setTeam1([]);
    setTeam2([]);
    setIsDrawn(false);
    setInputValue('');
    setBulkInput('');
    setAssignedPlayers(new Map());
    setAttackingTeam(null);
    setCoinTossPhase(null);
    setTeam1Choice(null);
    setCoinResult(null);
    setCoinWinner(null);
    if (spinIntervalRef.current) {
      clearTimeout(spinIntervalRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearTimeout(spinIntervalRef.current);
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
      </div>

      {/* Draw Mode Toggle */}
      <div className="flex justify-center gap-2">
        <Button
          onClick={() => setDrawMode('instant')}
          variant={drawMode === 'instant' ? 'default' : 'secondary'}
          className={cn('valorant-clip text-base', drawMode === 'instant' && 'bg-purple-600 hover:bg-purple-700 text-white')}
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

              <div className="relative w-96 h-96">
                {/* Pause Overlay */}
                {isPaused && (
                  <>
                    {/* Pause overlay background */}
                    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm rounded-full border-4 border-yellow-400 animate-pulse" />

                    {/* Pause symbol - centered with middle circle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex items-center justify-center">
                      <div className="flex gap-2 items-center justify-center">
                        <div className="w-3 h-10 bg-yellow-400 rounded"></div>
                        <div className="w-3 h-10 bg-yellow-400 rounded"></div>
                      </div>
                    </div>

                    {/* Pause text - below the center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-8 z-50 text-center" style={{ marginLeft: '2px' }}>
                      <p className="text-xl font-bold valorant-title text-yellow-400 tracking-wider">
                        PAUSED
                      </p>
                    </div>
                  </>
                )}

                {/* Spinning wheel */}
                <svg
                  ref={wheelRef}
                  className={cn(
                    "absolute inset-0 w-full h-full transition-opacity duration-300",
                    isPaused && "opacity-30"
                  )}
                  viewBox="0 0 200 200"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`
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
                  "absolute inset-0 rounded-full border-4 border-yellow-400/30 pointer-events-none transition-opacity duration-300",
                  !isPaused && "animate-pulse",
                  isPaused && "opacity-30"
                )}
                  style={{ transform: 'scale(1.05)' }} />
              </div>

              {/* Current selection indicator */}
              {!isPaused && (
                <div className="flex justify-center min-h-[60px] items-center">
                  {currentSpinningPlayer ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full"></div>
                      <div className="relative bg-card/90 backdrop-blur-sm border border-yellow-400/50 rounded-lg px-6 py-3">
                        <p className="text-3xl text-yellow-400 font-bold valorant-title tracking-wider">
                          {currentSpinningPlayer}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[60px]"></div>
                  )}
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
          className={cn(
            "w-full valorant-clip text-primary-foreground valorant-title text-lg py-6 tracking-wider",
            drawMode === 'instant'
              ? "bg-purple-600 hover:bg-purple-700"
              : "bg-primary hover:bg-primary/90"
          )}
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
                attackingTeam === 1 ? 'text-orange-500' : attackingTeam === 2 ? 'text-cyan-400' : 'text-primary'
              )}>
                Team 1 {attackingTeam === 1 && (
                  <span className="flex items-center gap-1">
                    (T)
                  </span>
                )}
                {attackingTeam === 2 && (
                  <span className="flex items-center gap-1">
                    (CT)
                  </span>
                )}
              </h3>
              <div className={cn(
                'bg-card border rounded p-4 space-y-2 transition-all duration-300 relative overflow-hidden',
                // Winner state - Highlight the winner with their chosen side color
                coinWinner === 1 && attackingTeam === 1 && 'ring-4 ring-orange-500 scale-105 shadow-2xl shadow-orange-500/50',
                coinWinner === 1 && attackingTeam === 2 && 'ring-4 ring-cyan-400 scale-105 shadow-2xl shadow-cyan-400/50',
                // Border state based on assigned side
                attackingTeam === 1 ? 'border-orange-500/50' : attackingTeam === 2 ? 'border-cyan-400/50' : 'border-primary/30'
              )}>
                {/* Side Badge */}
                {attackingTeam === 1 && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-black px-3 py-1 rounded-full text-xs font-bold valorant-title tracking-wider shadow-lg">
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
                attackingTeam === 2 ? 'text-orange-500' : attackingTeam === 1 ? 'text-cyan-400' : 'text-blue-400'
              )}>
                Team 2 {attackingTeam === 2 && (
                  <span className="flex items-center gap-1">
                    (T)
                  </span>
                )}
                {attackingTeam === 1 && (
                  <span className="flex items-center gap-1">
                    (CT)
                  </span>
                )}
              </h3>
              <div className={cn(
                'bg-card border rounded p-4 space-y-2 transition-all duration-300 relative overflow-hidden',
                // Winner state - Highlight the winner with their chosen side color
                coinWinner === 2 && attackingTeam === 2 && 'ring-4 ring-orange-500 scale-105 shadow-2xl shadow-orange-500/50',
                coinWinner === 2 && attackingTeam === 1 && 'ring-4 ring-cyan-400 scale-105 shadow-2xl shadow-cyan-400/50',
                // Border state based on assigned side
                attackingTeam === 2 ? 'border-orange-500/50' : attackingTeam === 1 ? 'border-cyan-400/50' : 'border-blue-500/30'
              )}>
                {/* Side Badge */}
                {attackingTeam === 2 && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-black px-3 py-1 rounded-full text-xs font-bold valorant-title tracking-wider shadow-lg">
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
            {/* Coin Toss Button */}
            {!coinTossPhase && (
              <Button
                onClick={startCoinToss}
                variant="secondary"
                className="valorant-clip text-base"
              >
                <Target className="w-4 h-4 mr-2" />
                Coin Toss for Side
              </Button>
            )}

            {/* Heads/Tails Selection */}
            {coinTossPhase === 'choose' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <p className="text-xl font-bold valorant-title text-center text-yellow-400">
                  Team 1: Choose Heads or Tails?
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => handleTeam1Choice('heads')}
                    className="valorant-clip text-lg px-8 py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 flex items-center gap-3 overflow-hidden"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <img src="/heads.png" className="w-full h-full object-cover scale-150" alt="Heads" />
                    </div>
                    HEADS
                  </Button>
                  <Button
                    onClick={() => handleTeam1Choice('tails')}
                    className="valorant-clip text-lg px-8 py-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 flex items-center gap-3 overflow-hidden"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <img src="/tails.png" className="w-full h-full object-cover scale-150" alt="Tails" />
                    </div>
                    TAILS
                  </Button>
                </div>
              </div>
            )}

            {/* Coin Flipping Animation */}
            {coinTossPhase === 'flipping' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="text-center flex flex-col items-center justify-center">
                  <div className="relative w-32 h-32 animate-coin-flip preserve-3d rounded-full">
                    <div className="absolute inset-0 backface-hidden rounded-full overflow-hidden bg-white">
                      <img src="/heads.png" className="w-full h-full object-cover scale-125" alt="Heads" />
                    </div>
                    <div className="absolute inset-0 backface-hidden rotate-x-180 rounded-full overflow-hidden bg-white">
                      <img src="/tails.png" className="w-full h-full object-cover scale-125" alt="Tails" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold valorant-title text-yellow-400 mt-8 animate-pulse">
                    Flipping...
                  </p>
                  <p className="text-muted-foreground mt-2">
                    Team 1 chose: <span className="text-yellow-400 font-bold uppercase">{team1Choice}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Coin Result & Side Selection */}
            {coinTossPhase === 'result' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="text-center space-y-3 flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden animate-[revealCard_0.5s_ease-out]">
                    <img
                      src={coinResult === 'heads' ? "/heads.png" : "/tails.png"}
                      className="w-full h-full object-cover scale-125"
                      alt={coinResult || ''}
                    />
                  </div>
                  <p className="text-3xl font-bold valorant-title text-yellow-400 mt-4">
                    Result: <span className="uppercase">{coinResult}</span>!
                  </p>
                  <p className="text-2xl font-bold valorant-title">
                    <span className={coinWinner === 1 ? 'text-red-500' : 'text-blue-500'}>
                      Team {coinWinner}
                    </span> wins the toss!
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-xl font-bold valorant-title text-center text-yellow-400">
                    Team {coinWinner}: Choose your side
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button
                      onClick={() => handleSideSelection('attack')}
                      className="valorant-clip text-lg px-8 py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      ATTACK (T)
                    </Button>
                    <Button
                      onClick={() => handleSideSelection('defense')}
                      className="valorant-clip text-lg px-8 py-6 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600"
                    >
                      DEFENSE (CT)
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Final Result Display */}
            {coinTossPhase === 'complete' && attackingTeam && (
              <div className="text-center text-lg animate-in fade-in duration-300">
                <p className="text-muted-foreground">
                  <span className="text-orange-500 font-bold">Team {attackingTeam}</span> starts on{' '}
                  <span className="text-orange-500 font-bold">Attack (T)</span>
                  {' • '}
                  <span className="text-cyan-400 font-bold">Team {attackingTeam === 1 ? 2 : 1}</span> starts on{' '}
                  <span className="text-cyan-400 font-bold">Defense (CT)</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
