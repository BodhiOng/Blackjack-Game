// Card types
export type Suit = "hearts" | "diamonds" | "clubs" | "spades"
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K"

export type CardType = {
  suit: Suit
  rank: Rank
  hidden?: boolean
}

// For client display only - no actual card data
export type ClientCardType = {
  id: string
  hidden: boolean
  suit?: Suit
  rank?: Rank
  isNew?: boolean // Added to track newly dealt cards
  dealSequence?: number // Added to track the dealing sequence
}

// Game states
export type GameState = "betting" | "playing" | "dealerTurn" | "gameOver"
export type GameResult = "playerWin" | "dealerWin" | "push" | "bust" | "dealerBust" | "blackjack" | null

// Provably fair data
export type ProvablyFairData = {
  gameId: string
  clientSeed: string
  serverSeed: string
  hashedServerSeed: string
  nonce: number
  completed: boolean
}

// Server-side game session
export interface GameSession {
  id: string
  deck: CardType[]
  dealerCards: CardType[]
  playerCards: CardType[]
  gameState: GameState
  balance: number
  bet: number
  gameResult: GameResult
  provablyFair?: ProvablyFairData
}

// Client-side game state (limited information)
export interface ClientGameState {
  sessionId: string
  dealerCards: ClientCardType[]
  playerCards: ClientCardType[]
  gameState: GameState
  balance: number
  bet: number
  dealerScore: number
  playerScore: number
  gameResult: GameResult
  message: string
  provablyFair?: {
    gameId: string
    clientSeed: string
    hashedServerSeed: string
    serverSeed?: string | null
    nonce: number
    completed: boolean
  }
}

