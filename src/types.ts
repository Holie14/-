export type Direction = 'left' | 'center' | 'right' | 'top-left' | 'top-right' | null;
export type Turn = 'player_gk' | 'player_kick';
export type Screen = 'home' | 'game' | 'shop' | 'history' | 'inventory';
export type GameStatus = 'idle' | 'aiming' | 'animating' | 'result' | 'gameOver';

export interface MatchResult {
  id: string;
  playerScore: number;
  aiScore: number;
  result: 'win' | 'draw' | 'loss';
  date: number;
}

export interface StoreItem {
  id: string;
  name: string;
  type: 'ball' | 'goal';
  price: number;
  style: string;
  rarity: 'solid' | 'gradient' | 'rainbow';
}

export interface GameState {
  playerScore: number;
  aiScore: number;
  attempts: number;
  turn: Turn;
  status: GameStatus;
  lastPlayerDirection: Direction;
  lastAiDirection: Direction;
  isGoal: boolean | null;
}
