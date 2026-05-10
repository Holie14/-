import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Coins, Settings, Play, RotateCcw, X, Volume2, Pause, ShoppingBag, History, ChevronLeft, Check } from 'lucide-react';
import { Direction, Turn, Screen, GameStatus, GameState, StoreItem, MatchResult } from './types';
import { useSwipe } from './hooks/useSwipe';

// --- Components ---

const ProgressBar = ({ value, label }: { value: number; label: string }) => (
  <div className="w-full">
    <div className="flex justify-between mb-1 text-xs font-medium text-white/80">
      <span>{label}</span>
      <span>{Math.round(value * 100)}%</span>
    </div>
    <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
      <div 
        className="bg-emerald-400 h-full transition-all duration-300"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  </div>
);

// --- Main App ---

const STORE_ITEMS: StoreItem[] = [
  // Balls
  { id: 'ball-white', name: 'Original White', type: 'ball', price: 0, style: 'bg-white', rarity: 'solid' },
  { id: 'ball-red', name: 'Red Fire', type: 'ball', price: 100, style: 'bg-red-500', rarity: 'solid' },
  { id: 'ball-blue', name: 'Blue Ice', type: 'ball', price: 100, style: 'bg-blue-500', rarity: 'solid' },
  { id: 'ball-yellow', name: 'Yellow Sun', type: 'ball', price: 100, style: 'bg-yellow-500', rarity: 'solid' },
  { id: 'ball-green', name: 'Green Field', type: 'ball', price: 100, style: 'bg-emerald-500', rarity: 'solid' },
  { id: 'ball-pink', name: 'Pink Lady', type: 'ball', price: 100, style: 'bg-pink-500', rarity: 'solid' },
  { id: 'ball-orange', name: 'Orange Juice', type: 'ball', price: 100, style: 'bg-orange-500', rarity: 'solid' },
  { id: 'ball-grad-1', name: 'Sunrise', type: 'ball', price: 300, style: 'bg-gradient-to-tr from-orange-500 to-pink-500', rarity: 'gradient' },
  { id: 'ball-grad-2', name: 'Deep Sea', type: 'ball', price: 300, style: 'bg-gradient-to-tr from-indigo-500 to-cyan-500', rarity: 'gradient' },
  { id: 'ball-grad-3', name: 'Forest', type: 'ball', price: 300, style: 'bg-gradient-to-tr from-green-500 to-emerald-900', rarity: 'gradient' },
  { id: 'ball-grad-4', name: 'Volcano', type: 'ball', price: 300, style: 'bg-gradient-to-tr from-red-600 to-orange-400', rarity: 'gradient' },
  { id: 'ball-rainbow', name: 'Rainbow', type: 'ball', price: 500, style: 'bg-gradient-to-tr from-red-500 via-green-500 to-blue-500', rarity: 'rainbow' },
  
  // Goals
  { id: 'goal-white', name: 'Original White', type: 'goal', price: 0, style: 'border-white', rarity: 'solid' },
  { id: 'goal-red', name: 'Crimson Post', type: 'goal', price: 100, style: 'border-red-500', rarity: 'solid' },
  { id: 'goal-blue', name: 'Cobalt Post', type: 'goal', price: 100, style: 'border-blue-500', rarity: 'solid' },
  { id: 'goal-yellow', name: 'Golden Post', type: 'goal', price: 100, style: 'border-yellow-400', rarity: 'solid' },
  { id: 'goal-green', name: 'Emerald Post', type: 'goal', price: 100, style: 'border-emerald-500', rarity: 'solid' },
  { id: 'goal-grad-1', name: 'Dusk Goal', type: 'goal', price: 200, style: 'border-pink-500', rarity: 'gradient' },
  { id: 'goal-grad-2', name: 'Ocean Goal', type: 'goal', price: 200, style: 'border-cyan-400', rarity: 'gradient' },
  { id: 'goal-grad-3', name: 'Sunset Goal', type: 'goal', price: 200, style: 'border-orange-500', rarity: 'gradient' },
  { id: 'goal-grad-4', name: 'Night Goal', type: 'goal', price: 200, style: 'border-indigo-600', rarity: 'gradient' },
  { id: 'goal-rainbow', name: 'Chroma Goal', type: 'goal', price: 500, style: 'border-indigo-500', rarity: 'rainbow' },
  { id: 'goal-rainbow-2', name: 'Prism Goal', type: 'goal', price: 500, style: 'border-rose-400', rarity: 'rainbow' },
];

export default function App() {
  // State
  const [screen, setScreen] = useState<Screen>('home');
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem('pes_coins');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(0.7);
  
  const [purchasedItems, setPurchasedItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('pes_purchased');
    return saved ? JSON.parse(saved) : ['ball-white', 'goal-white'];
  });
  const [selectedBall, setSelectedBall] = useState<string>(() => {
    return localStorage.getItem('pes_selected_ball') || 'ball-white';
  });
  const [selectedGoal, setSelectedGoal] = useState<string>(() => {
    return localStorage.getItem('pes_selected_goal') || 'goal-white';
  });
  const [matchHistory, setMatchHistory] = useState<MatchResult[]>(() => {
    const saved = localStorage.getItem('pes_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [gameState, setGameState] = useState<GameState>({
    playerScore: 0,
    aiScore: 0,
    attempts: 0,
    turn: 'player_gk', // Starts with player saving
    status: 'idle',
    lastPlayerDirection: null,
    lastAiDirection: null,
    isGoal: null
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  // --- Sound Effects Utility ---
  const playSfx = useCallback((type: 'goal' | 'save' | 'countdown' | 'go' | 'crowd') => {
    if (volume <= 0) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'goal') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15); // Higher sweep for "Wa!"
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.start();
      osc.stop(now + 1.2);
      
      // More vibrant cheer noise
      const bufferSize = ctx.sampleRate * 1.5;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.sin(i / 10); // Modulated noise
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * 0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      whiteNoise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      whiteNoise.start();
    } else if (type === 'save') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.3); // Descending groan "Woo..."
      gain.gain.setValueAtTime(volume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.start();
      osc.stop(now + 0.8);

      // Low frequency noise for "Woo"
      const bufferSize = ctx.sampleRate * 0.8;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.2;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * 0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      noiseSource.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start();
    } else if (type === 'countdown') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start();
      osc.stop(now + 0.2);
    } else if (type === 'go') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.50, now); // C6
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start();
      osc.stop(now + 0.4);
    } else if (type === 'crowd') {
      // Periodic crowd murmur (noise)
      const bufferSize = 2 * ctx.sampleRate,
      noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate),
      output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(volume * 0.1, now + 0.5);
      noiseGain.gain.linearRampToValueAtTime(0, now + 2);
      whiteNoise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      whiteNoise.start();
    }
  }, [volume]);

  // Crowd Ambient
  useEffect(() => {
    if (screen !== 'game' || isPaused || volume <= 0) return;
    
    const interval = setInterval(() => {
      playSfx('crowd');
    }, 4000);
    
    playSfx('crowd');
    return () => clearInterval(interval);
  }, [screen, isPaused, volume, playSfx]);

  // Save coins and history to local storage
  useEffect(() => {
    localStorage.setItem('pes_coins', coins.toString());
    localStorage.setItem('pes_purchased', JSON.stringify(purchasedItems));
    localStorage.setItem('pes_selected_ball', selectedBall);
    localStorage.setItem('pes_selected_goal', selectedGoal);
    localStorage.setItem('pes_history', JSON.stringify(matchHistory));
  }, [coins, purchasedItems, selectedBall, selectedGoal, matchHistory]);

  // Handle Game Over Side Effects
  useEffect(() => {
    if (gameState.status === 'gameOver') {
      const finalResult: 'win' | 'draw' | 'loss' = 
        gameState.playerScore > gameState.aiScore ? 'win' : 
        gameState.playerScore === gameState.aiScore ? 'draw' : 'loss';
      
      const matchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newResult: MatchResult = {
        id: matchId,
        playerScore: gameState.playerScore,
        aiScore: gameState.aiScore,
        result: finalResult,
        date: Date.now(),
      };

      setMatchHistory(h => {
        // Prevent accidental double saves if the effect runs twice (though it shouldn't)
        if (h.some(m => m.id === matchId)) return h;
        return [newResult, ...h].slice(0, 20);
      });

      if (finalResult === 'win') {
        setCoins(c => c + 10);
      } else if (finalResult === 'draw') {
        setCoins(c => c + 3);
      }
    }
  }, [gameState.status]);

  // Space for pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && screen === 'game' && gameState.status !== 'gameOver') {
        setIsPaused(prev => !prev);
      }
      
      // Arrow keys for direction
      if (screen === 'game' && gameState.status === 'idle' && !isPaused && countdown === null) {
        let dir: Direction = null;
        if (e.key === 'ArrowLeft') dir = 'left';
        if (e.key === 'ArrowRight') dir = 'right';
        if (e.key === 'ArrowUp') dir = 'center';
        if (e.key === 'q' || e.key === 'Q') dir = 'top-left';
        if (e.key === 'e' || e.key === 'E') dir = 'top-right';

        if (dir) handleAction(dir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, gameState.status, isPaused, countdown]);

  const startGame = () => {
    setGameState({
      playerScore: 0,
      aiScore: 0,
      attempts: 0,
      turn: 'player_gk',
      status: 'idle',
      lastPlayerDirection: null,
      lastAiDirection: null,
      isGoal: null
    });
    setCountdown(null);
    setScreen('game');
    setIsPaused(false);
  };

  const quitToHome = () => {
    setIsPaused(false);
    setGameState(prev => ({ ...prev, status: 'idle' }));
    setScreen('home');
  };

  const handleAction = useCallback((direction: Direction) => {
    if (gameState.status !== 'idle' || isPaused || countdown !== null) return;

    // Start Countdown
    let count = 3;
    setCountdown(count);
    playSfx('countdown');

    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playSfx('countdown');
      } else {
        setCountdown(null);
        playSfx('go');
        clearInterval(interval);
        executeKick(direction);
      }
    }, 800);

  }, [gameState.status, isPaused, countdown, playSfx]);

  const executeKick = (direction: Direction) => {
    // AI logic (random choice for now)
    const directions: Direction[] = ['left', 'center', 'right', 'top-left', 'top-right'];
    const aiChoice = directions[Math.floor(Math.random() * directions.length)];

    setGameState(prev => ({
      ...prev,
      status: 'animating',
      lastPlayerDirection: direction,
      lastAiDirection: aiChoice
    }));

    // Calculate result after animation duration (approx 800ms)
    setTimeout(() => {
      setGameState(prev => {
        let isGoal = false;
        let pScore = prev.playerScore;
        let aScore = prev.aiScore;

        if (prev.turn === 'player_kick') {
          // Player kicks, AI saves
          isGoal = direction !== aiChoice;
          if (isGoal) {
            pScore += 1;
            playSfx('goal');
          } else {
            playSfx('save');
          }
        } else {
          // AI kicks, Player saves
          isGoal = aiChoice !== direction;
          if (isGoal) {
            aScore += 1;
            playSfx('goal');
          } else {
            playSfx('save');
          }
        }

        return {
          ...prev,
          status: 'result',
          isGoal,
          playerScore: pScore,
          aiScore: aScore
        };
      });

      // Next turn or round end
      setTimeout(() => {
        setGameState(prev => {
          const nextAttempts = prev.turn === 'player_kick' ? prev.attempts + 1 : prev.attempts;
          const nextTurn: Turn = prev.turn === 'player_gk' ? 'player_kick' : 'player_gk';
          
          if (nextAttempts >= 5 && prev.turn === 'player_kick') {
            return { ...prev, status: 'gameOver' };
          }

          return {
            ...prev,
            attempts: nextAttempts,
            turn: nextTurn,
            status: 'idle',
            lastPlayerDirection: null,
            lastAiDirection: null,
            isGoal: null
          };
        });
      }, 1500);
    }, 800);
  };

  const { onTouchStart, onTouchEnd } = useSwipe(handleAction);

  // Animation variants
  const getBallPosition = (dir: Direction) => {
    switch (dir) {
      case 'left': return { x: -160, y: -150, scale: 0.35 };
      case 'right': return { x: 160, y: -150, scale: 0.35 };
      case 'center': return { x: 0, y: -180, scale: 0.35 };
      case 'top-left': return { x: -140, y: -260, scale: 0.35 };
      case 'top-right': return { x: 140, y: -260, scale: 0.35 };
      default: return { x: 0, y: 0, scale: 1 };
    }
  };

  const getKeeperPosition = (dir: Direction) => {
    switch (dir) {
      case 'left': return { x: -120, y: 0, rotate: -45 };
      case 'right': return { x: 120, y: 0, rotate: 45 };
      case 'center': return { x: 0, y: -30, rotate: 0 };
      case 'top-left': return { x: -100, y: -120, rotate: -60 }; // Higher
      case 'top-right': return { x: 100, y: -120, rotate: 60 }; // Higher
      default: return { x: 0, y: 0, rotate: 0 };
    }
  };

  const buyItem = (item: StoreItem) => {
    if (coins >= item.price && !purchasedItems.includes(item.id)) {
      setCoins(c => c - item.price);
      setPurchasedItems(p => [...p, item.id]);
    }
  };

  const selectItem = (item: StoreItem) => {
    if (purchasedItems.includes(item.id)) {
      if (item.type === 'ball') setSelectedBall(item.id);
      else setSelectedGoal(item.id);
    }
  };

  const randomEquip = () => {
    const ownedBalls = STORE_ITEMS.filter(i => i.type === 'ball' && purchasedItems.includes(i.id));
    const ownedGoals = STORE_ITEMS.filter(i => i.type === 'goal' && purchasedItems.includes(i.id));
    
    if (ownedBalls.length > 0) {
      const randomBall = ownedBalls[Math.floor(Math.random() * ownedBalls.length)];
      setSelectedBall(randomBall.id);
    }
    
    if (ownedGoals.length > 0) {
      const randomGoal = ownedGoals[Math.floor(Math.random() * ownedGoals.length)];
      setSelectedGoal(randomGoal.id);
    }
  };

  const currentBall = STORE_ITEMS.find(i => i.id === selectedBall) || STORE_ITEMS[0];
  const currentGoal = STORE_ITEMS.find(i => i.id === selectedGoal) || STORE_ITEMS[8];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#1b4332] font-sans text-white select-none">
      
      {/* --- Home Screen --- */}
      {screen === 'home' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-[#1b4332] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="h-full w-full" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #2d6a4f 0px, #2d6a4f 100px, #40916c 100px, #40916c 200px)', backgroundSize: '100% 200px' }}></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#081c15]/80 via-transparent to-[#081c15]/80 shadow-inner"></div>
          </div>
          
          {/* Top Coins */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-md px-6 py-2 rounded-2xl border border-yellow-500 z-20">
            <span className="text-yellow-400 font-bold text-xl flex items-center gap-2">
              <Coins className="w-6 h-6 fill-current" /> {coins.toLocaleString()}
            </span>
          </div>

          {/* Side Panels - Shop Trigger (Left) */}
          <button 
            onClick={() => setScreen('shop')}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-16 h-32 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <ShoppingBag className="w-6 h-6" />
            <span className="text-[8px] font-black uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">SHOP</span>
          </button>

          {/* Side Panels - Inventory Trigger (Left Bottom) */}
          <button 
            onClick={() => setScreen('inventory')}
            className="absolute left-6 top-[70%] -translate-y-1/2 z-20 w-16 h-32 bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-md rounded-full border border-emerald-500/30 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Settings className="w-6 h-6" />
            <span className="text-[8px] font-black uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">INV</span>
          </button>

          {/* Side Panels - History Trigger (Right) */}
          <button 
            onClick={() => setScreen('history')}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-16 h-48 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95"
          >
            <History className="w-8 h-8" />
            <span className="text-[10px] font-black uppercase tracking-widest [writing-mode:vertical-lr]">HISTORY</span>
          </button>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex flex-col items-center gap-20 text-center pt-52"
          >
            <div className="space-y-4">
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase italic bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] leading-tight">
                SUPER<br />PENALTY
              </h1>
              <p className="text-white/60 text-lg md:text-xl font-medium max-w-sm mx-auto uppercase tracking-widest opacity-80">
                Are you ready for the win?
              </p>
            </div>

            <div className="flex flex-col items-center gap-6">
              <button 
                onClick={startGame}
                id="start-match-btn"
                className="group relative flex items-center gap-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-16 py-6 rounded-full text-3xl font-black transition-all hover:scale-105 active:scale-95 shadow-[0_15px_60px_rgba(16,185,129,0.5)] uppercase tracking-tight italic"
              >
                <Play className="w-10 h-10 fill-current" />
                경기 시작
              </button>
              <div className="text-white/30 text-xs font-bold uppercase tracking-[0.5em] italic">
                개발자: uiji
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-2 opacity-20 group">
              <div className="h-[1px] w-12 bg-white mb-2" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                Internet Required • Free to Play
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]">
                Progress saved automatically to this device
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- Shop Screen --- */}
      <AnimatePresence>
        {screen === 'shop' && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="absolute inset-0 z-40 bg-[#081c15] flex flex-col p-8 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-12">
              <button 
                onClick={() => setScreen('home')}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors uppercase font-black tracking-widest"
              >
                <ChevronLeft className="w-6 h-6" /> Back
              </button>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase">Ball & Goal Shop</h2>
              <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full border border-yellow-500/50">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-yellow-500">{coins}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <section className="space-y-6">
                <h3 className="text-xl font-black uppercase text-white/40 tracking-widest border-b border-white/10 pb-2">Balls</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {STORE_ITEMS.filter(i => i.type === 'ball' && !purchasedItems.includes(i.id)).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-white/20 font-bold uppercase text-xs">No balls available</div>
                  ) : (
                    STORE_ITEMS.filter(i => i.type === 'ball' && !purchasedItems.includes(i.id)).map(item => (
                      <button 
                        key={item.id}
                        onClick={() => buyItem(item)}
                        className="relative aspect-square flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-white/5 bg-black/20 group hover:border-yellow-500/50 transition-all overflow-hidden"
                      >
                        <div className={`w-12 h-12 rounded-full shadow-lg ${item.style}`} />
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase opacity-60">{item.name}</div>
                          <div className="text-xs font-bold text-yellow-500 flex items-center justify-center gap-1 mt-1">
                            <Coins className="w-3 h-3" /> {item.price}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-xl font-black uppercase text-white/40 tracking-widest border-b border-white/10 pb-2">Goal Posts</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {STORE_ITEMS.filter(i => i.type === 'goal' && !purchasedItems.includes(i.id)).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-white/20 font-bold uppercase text-xs">No goals available</div>
                  ) : (
                    STORE_ITEMS.filter(i => i.type === 'goal' && !purchasedItems.includes(i.id)).map(item => (
                      <button 
                        key={item.id}
                        onClick={() => buyItem(item)}
                        className="relative aspect-square flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-white/5 bg-black/20 group hover:border-yellow-500/50 transition-all overflow-hidden"
                      >
                        <div className={`w-16 h-10 border-[4px] rounded-sm ${item.style} bg-emerald-950/20`} />
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase opacity-60">{item.name}</div>
                          <div className="text-xs font-bold text-yellow-500 flex items-center justify-center gap-1 mt-1">
                            <Coins className="w-3 h-3" /> {item.price}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Inventory Screen --- */}
      <AnimatePresence>
        {screen === 'inventory' && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-0 z-40 bg-[#081c15] flex flex-col p-8 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setScreen('home')}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors uppercase font-black tracking-widest"
              >
                <ChevronLeft className="w-6 h-6" /> Back
              </button>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase">Inventory</h2>
              <button 
                onClick={randomEquip}
                className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-6 py-2 rounded-full font-black uppercase tracking-tighter transition-all active:scale-95"
              >
                무작위 장착
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <section className="space-y-6">
                <h3 className="text-xl font-black uppercase text-white/40 tracking-widest border-b border-white/10 pb-2">Owned Balls</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {STORE_ITEMS.filter(i => i.type === 'ball' && purchasedItems.includes(i.id)).map(item => (
                    <button 
                      key={item.id}
                      onClick={() => selectItem(item)}
                      className={`relative aspect-square flex flex-col items-center justify-center gap-3 rounded-3xl border-2 transition-all overflow-hidden ${
                        selectedBall === item.id 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-white/20 bg-white/5 group hover:border-white/40'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full shadow-lg ${item.style} ${item.rarity === 'rainbow' ? 'animate-pulse' : ''}`} />
                      <div className="text-center">
                        <div className="text-[10px] font-black uppercase opacity-60">{item.name}</div>
                        <div className="text-[8px] font-bold text-blue-400 mt-1 uppercase">{item.rarity}</div>
                      </div>
                      {selectedBall === item.id && (
                        <div className="absolute top-2 right-2 bg-blue-500 p-1 rounded-full">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-xl font-black uppercase text-white/40 tracking-widest border-b border-white/10 pb-2">Owned Goals</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {STORE_ITEMS.filter(i => i.type === 'goal' && purchasedItems.includes(i.id)).map(item => (
                    <button 
                      key={item.id}
                      onClick={() => selectItem(item)}
                      className={`relative aspect-square flex flex-col items-center justify-center gap-3 rounded-3xl border-2 transition-all overflow-hidden ${
                        selectedGoal === item.id 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : 'border-white/20 bg-white/5 group hover:border-white/40'
                      }`}
                    >
                      <div className={`w-16 h-10 border-[4px] rounded-sm ${item.style} bg-emerald-950/20`} />
                      <div className="text-center">
                        <div className="text-[10px] font-black uppercase opacity-60">{item.name}</div>
                        <div className="text-[8px] font-bold text-emerald-400 mt-1 uppercase">{item.rarity}</div>
                      </div>
                      {selectedGoal === item.id && (
                        <div className="absolute top-2 right-2 bg-emerald-500 p-1 rounded-full">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- History Screen --- */}
      <AnimatePresence>
        {screen === 'history' && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 z-40 bg-[#081c15] flex flex-col p-8 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl font-black italic tracking-tighter uppercase">Match History</h2>
              <button 
                onClick={() => setScreen('home')}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors uppercase font-black tracking-widest"
              >
                Back <X className="w-6 h-6" />
              </button>
            </div>

            <div className="w-full max-w-2xl mx-auto space-y-4">
              {matchHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/20">
                  <History className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-black uppercase tracking-widest">No matches played yet</p>
                </div>
              ) : (
                matchHistory.map(match => (
                  <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      <div className={`text-2xl font-black italic tracking-tighter uppercase ${
                        match.result === 'win' ? 'text-emerald-400' : match.result === 'draw' ? 'text-yellow-400' : 'text-rose-500'
                      }`}>
                        {match.result}
                      </div>
                      <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl">
                        <span className="text-2xl font-mono font-black">{match.playerScore}</span>
                        <span className="text-white/20 font-black">-</span>
                        <span className="text-2xl font-mono font-black">{match.aiScore}</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      {new Date(match.date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Game Screen --- */}
      {screen === 'game' && (
        <div 
          className="relative w-full h-full flex flex-col items-center justify-center bg-[#1b4332] p-4 md:p-8 overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Background: Field and Crowd */}
          <div className="absolute inset-0 pointer-events-none opacity-50 z-0">
            <div className="h-full w-full" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #2d6a4f 0px, #2d6a4f 100px, #40916c 100px, #40916c 200px)' }}></div>
            <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-[#081c15] to-transparent"></div>
          </div>

          <div className="absolute top-[10%] w-full text-center z-0 opacity-40">
            <div className="inline-block px-4 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-[0.3em] mb-4">Spectators Area</div>
            <div className="flex justify-center gap-1">
              <div className="grid grid-cols-12 gap-1.5">
                {[...Array(60)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    animate={{ y: [0, -2, 0] }}
                    transition={{ repeat: Infinity, duration: 1 + Math.random(), delay: Math.random() }}
                    className={`w-3 h-3 rounded-t-full ${['bg-blue-400', 'bg-red-400', 'bg-yellow-400', 'bg-white', 'bg-emerald-400'][i % 5]}`} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="absolute top-6 left-6 z-20 flex flex-col items-start gap-4">
            <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl border-2 border-red-500 flex items-center gap-4 shadow-xl">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center font-bold italic text-base">AI</div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest text-red-300 font-bold leading-none mb-1">Score</span>
                <span id="ai-score" className="text-2xl font-black font-mono leading-none">{gameState.aiScore}</span>
              </div>
              <div className="flex gap-1 ml-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < gameState.attempts && gameState.aiScore > gameState.playerScore ? 'bg-red-500' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-3 shadow-2xl">
            <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-yellow-500 flex items-center gap-3">
              <span className="text-yellow-400 font-bold text-base flex items-center gap-2">
                <Coins className="w-4 h-4 fill-current" /> {coins.toLocaleString()}
              </span>
            </div>
            
            <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl border-2 border-blue-500 flex items-center gap-4 shadow-xl">
              <div className="flex gap-1 mr-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < gameState.attempts && gameState.playerScore > gameState.aiScore ? 'bg-blue-500' : 'bg-white/10'}`} />
                ))}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-blue-300 font-bold leading-none mb-1">Me</span>
                <span id="player-score" className="text-2xl font-black font-mono leading-none">{gameState.playerScore}</span>
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold italic text-base">ME</div>
            </div>
          </div>

          {/* Stadium Visualization */}
          <div className="relative w-full max-w-4xl aspect-[16/9] flex items-center justify-center z-10 mt-12 scale-90 md:scale-100">
            {/* Goal Posts */}
            <div className={`absolute bottom-[20%] w-[80%] h-[60%] border-l-[10px] border-r-[10px] border-t-[10px] ${currentGoal.style} relative bg-white/5 z-0 shadow-[0_30px_60px_rgba(0,0,0,0.4)]`}>
              {/* Net */}
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '15px 15px', opacity: 0.1 }}></div>
            </div>

            {/* Goalkeeper */}
            <motion.div 
              className="absolute bottom-[22%] z-10 w-16 md:w-20"
              initial={getKeeperPosition(null)}
              animate={getKeeperPosition(gameState.turn === 'player_gk' ? gameState.lastPlayerDirection : gameState.lastAiDirection)}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            >
              <div className="relative flex flex-col items-center">
                <div className={`w-10 h-10 md:w-12 md:h-12 ${gameState.turn === 'player_gk' ? 'bg-blue-600 border-blue-400' : 'bg-zinc-800 border-zinc-700'} rounded-full border-[3px] shadow-xl`} />
                <div className={`w-14 md:w-18 h-16 md:h-20 ${gameState.turn === 'player_gk' ? 'bg-blue-500' : 'bg-yellow-500 border-x-[3px] border-yellow-600'} rounded-t-3xl -mt-2 shadow-xl`} />
                <div className="text-[7px] font-bold mt-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full uppercase tracking-tighter text-white/80">
                  {gameState.turn === 'player_gk' ? 'ME' : 'AI'}
                </div>
              </div>
            </motion.div>

            {/* Kicker Silhouette */}
            <AnimatePresence>
              {gameState.status === 'idle' && countdown === null && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 0.9 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center scale-50 md:scale-75"
                >
                  <div className={`w-10 h-10 ${gameState.turn === 'player_kick' ? 'bg-blue-600 border-blue-400' : 'bg-emerald-600 border-emerald-400'} rounded-full mb-1 border-2`} />
                  <div className={`w-20 h-16 ${gameState.turn === 'player_kick' ? 'bg-blue-500' : 'bg-emerald-500'} rounded-t-xl`} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ball */}
            <motion.div 
              className="absolute bottom-12 z-20"
              initial={getBallPosition(null)}
              animate={getBallPosition(gameState.turn === 'player_kick' ? gameState.lastPlayerDirection : gameState.lastAiDirection)}
              transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }} 
            >
              <div className="relative">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${currentBall.style} shadow-2xl overflow-hidden border border-black/10`}>
                  <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/football-no-lines.png')] ${currentBall.rarity === 'rainbow' ? 'opacity-40 animate-pulse' : 'opacity-80'}`} />
                </div>
                <motion.div 
                  className="absolute -bottom-1 translate-x-1/4 w-3/4 h-1.5 bg-black/40 rounded-full blur-md"
                  animate={{ scale: gameState.status === 'animating' ? 0.3 : 1, opacity: gameState.status === 'animating' ? 0.1 : 0.4 }}
                />
              </div>
            </motion.div>

            {/* Countdown Overlay */}
            <AnimatePresence>
              {countdown !== null && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1.5 }}
                  exit={{ opacity: 0, scale: 2 }}
                  className="absolute z-40 text-8xl font-black italic text-white drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                >
                  {countdown}
                </motion.div>
              )}
            </AnimatePresence>

            {/* UI Feedbacks */}
            <AnimatePresence>
              {gameState.status === 'idle' && countdown === null && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-28 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-sm font-black uppercase tracking-widest italic"
                >
                  {gameState.turn === 'player_gk' ? '막으세요!' : '차세요!'}
                </motion.div>
              )}
              {gameState.status === 'result' && (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  className={`absolute top-0 z-30 text-8xl md:text-9xl font-black italic uppercase tracking-tighter drop-shadow-[0_10px_50px_rgba(0,0,0,0.6)] ${
                    gameState.isGoal ? 'text-yellow-400' : 'text-rose-500'
                  }`}
                >
                  {gameState.isGoal ? 'GOAL!' : 'SAVED!'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute bottom-8 left-12 flex flex-col gap-2 z-20 pointer-events-none hidden md:flex opacity-50">
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">Control Guide</span>
            <div className="flex items-center gap-2 scale-75 origin-left">
              <div className="w-8 h-8 border-2 border-white/30 rounded flex items-center justify-center font-bold">←</div>
              <div className="flex flex-col gap-1">
                <div className="w-8 h-8 border-2 border-white/30 rounded flex items-center justify-center font-bold">↑</div>
                <div className="w-8 h-8 border-2 border-white/30 rounded flex items-center justify-center font-bold">↓</div>
              </div>
              <div className="w-8 h-8 border-2 border-white/30 rounded flex items-center justify-center font-bold">→</div>
              <div className="ml-4 text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full whitespace-nowrap">OR SWIPE TO AIM</div>
            </div>
          </div>
        </div>
      )}

      {/* --- Pause Menu --- */}
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-6"
          >
            <div className="w-full max-w-lg bg-[#1b4332] border-4 border-white/20 rounded-[40px] p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center">
              <h2 className="text-5xl font-black italic mb-8 tracking-tighter uppercase">Paused</h2>
              
              <div className="w-full space-y-4 mb-8">
                <button 
                  onClick={() => setIsPaused(false)}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xl font-bold transition-all shadow-lg border-b-4 border-blue-800 uppercase tracking-wider text-white"
                >
                  경기 이어서 플레이하기
                </button>
                <button 
                  onClick={quitToHome}
                  className="w-full py-5 bg-red-600 hover:bg-red-500 rounded-2xl text-xl font-bold transition-all shadow-lg border-b-4 border-red-800 uppercase tracking-wider text-white"
                >
                  기권
                </button>
              </div>

              <div className="w-full flex flex-col gap-4 bg-black/30 p-6 rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Audio Volume</span>
                  <span className="text-xs font-bold">{Math.round(volume * 100)}%</span>
                </div>
                <div className="relative w-full h-4 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${volume * 100}%` }}
                    className="absolute top-0 left-0 h-full bg-yellow-400"
                  />
                  <input 
                    type="range" 
                    min="0" max="1" step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
              </div>
              <p className="mt-8 text-[10px] uppercase tracking-[0.4em] opacity-40 font-bold">Press Space to Resume</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Game Over Overlay --- */}
      <AnimatePresence>
        {gameState.status === 'gameOver' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-[#081c15] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg flex flex-col items-center text-center gap-12 bg-white/5 p-12 rounded-[50px] border border-white/10 shadow-2xl"
            >
              <div className="relative">
                <div className={`p-8 rounded-full ${gameState.playerScore > gameState.aiScore ? 'bg-emerald-500 border-4 border-emerald-300 shadow-[0_0_60px_rgba(16,185,129,0.5)]' : gameState.playerScore === gameState.aiScore ? 'bg-yellow-500 border-4 border-yellow-300 shadow-[0_0_60px_rgba(234,179,8,0.5)]' : 'bg-rose-500 border-4 border-rose-300 shadow-[0_0_60px_rgba(244,63,94,0.5)]'}`}>
                  <Trophy className={`w-16 h-16 ${gameState.playerScore > gameState.aiScore ? 'text-emerald-950' : gameState.playerScore === gameState.aiScore ? 'text-yellow-950' : 'text-rose-950'} fill-current`} />
                </div>
                {gameState.playerScore >= gameState.aiScore && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 px-6 py-1.5 rounded-full text-base font-black italic whitespace-nowrap shadow-xl border-b-4 border-yellow-600"
                  >
                    +{gameState.playerScore > gameState.aiScore ? '10' : '3'} COINS
                  </motion.div>
                )}
              </div>

              <div className="space-y-4">
                <h2 className="text-6xl md:text-7xl font-black uppercase italic tracking-tighter text-white brightness-125">
                  {gameState.playerScore > gameState.aiScore ? 'VICTORY' : gameState.playerScore === gameState.aiScore ? 'DRAW' : 'DEFEAT'}
                </h2>
                <div className="flex items-center justify-center gap-12 bg-black/40 px-8 py-4 rounded-3xl border border-white/10">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">PLAYER</span>
                    <span className="text-5xl font-black font-mono">{gameState.playerScore}</span>
                  </div>
                  <div className="text-2xl font-black text-white/10">VS</div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">AI</span>
                    <span className="text-5xl font-black font-mono">{gameState.aiScore}</span>
                  </div>
                </div>
              </div>

              <div className="w-full grid grid-cols-1 gap-4">
                <button 
                  onClick={startGame}
                  className="group relative w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl border-b-4 border-blue-800 uppercase italic tracking-wider text-xl"
                >
                  <RotateCcw className="w-5 h-5 inline-block mr-2" /> 다시 도전하기
                </button>
                <button 
                  onClick={quitToHome}
                  className="w-full bg-white/10 text-white/60 font-bold py-4 rounded-2xl hover:bg-white/20 active:scale-95 transition-all border border-white/10 uppercase tracking-widest text-sm"
                >
                  홈으로 돌아가기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Pause Hint */}
      {screen === 'game' && !isPaused && gameState.status !== 'gameOver' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
          <Pause className="w-3 h-3 text-white/50" />
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">SPACE TO PAUSE</span>
        </div>
      )}
    </div>
  );
}
