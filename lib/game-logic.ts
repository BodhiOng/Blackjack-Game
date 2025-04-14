import type { CardType, ClientCardType, GameResult, Suit, Rank } from "./types"
import { v4 as uuidv4 } from "uuid"
import { generateShuffledDeck as generateProvablyFairDeck } from "./provably-fair"

// Initialize or shuffle deck
export function createDeck(): CardType[] {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"]
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
  const newDeck: CardType[] = []

  for (const suit of suits) {
    for (const rank of ranks) {
      newDeck.push({ suit, rank })
    }
  }

  // Shuffle the deck
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]
  }

  return newDeck
}

// Create a deck using provably fair algorithm
export function createProvablyFairDeck(serverSeed: string, clientSeed: string): CardType[] {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"]
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

  // Create a standard ordered deck
  const orderedDeck: CardType[] = []
  for (const suit of suits) {
    for (const rank of ranks) {
      orderedDeck.push({ suit, rank })
    }
  }

  // Get the provably fair shuffle indices
  const shuffleIndices = generateProvablyFairDeck(serverSeed, clientSeed)

  // Create the shuffled deck
  const shuffledDeck: CardType[] = []
  for (const index of shuffleIndices) {
    shuffledDeck.push(orderedDeck[index])
  }

  return shuffledDeck
}

// Calculate score of cards
export function calculateScore(cards: CardType[]): number {
  let score = 0
  let aces = 0

  for (const card of cards) {
    if (card.hidden) continue

    if (card.rank === "A") {
      aces++
      score += 11
    } else if (["K", "Q", "J"].includes(card.rank)) {
      score += 10
    } else {
      score += Number.parseInt(card.rank)
    }
  }

  // Adjust for aces
  while (score > 21 && aces > 0) {
    score -= 10
    aces--
  }

  return score
}

// Convert server cards to client cards (hiding information as needed)
export function convertToClientCards(
  cards: CardType[],
  markNewCard = false,
  isInitialDeal = false,
  isDealer = false,
): ClientCardType[] {
  // If markNewCard is true, only mark the last card as new
  const result = cards.map((card, index) => {
    const isLastCard = index === cards.length - 1

    // For initial deal, set the deal sequence
    let dealSequence = undefined
    if (isInitialDeal) {
      if (isDealer) {
        dealSequence = index === 0 ? 0 : 2 // Dealer cards are 1st and 3rd
      } else {
        dealSequence = index === 0 ? 1 : 3 // Player cards are 2nd and 4th
      }
    }

    if (card.hidden) {
      return {
        id: uuidv4(),
        hidden: true,
        isNew: markNewCard && isLastCard,
        dealSequence,
      }
    }

    return {
      id: uuidv4(),
      hidden: false,
      suit: card.suit,
      rank: card.rank,
      isNew: markNewCard && isLastCard,
      dealSequence,
    }
  })

  return result
}

// Determine game result
export function determineGameResult(playerCards: CardType[], dealerCards: CardType[]): GameResult {
  const playerScore = calculateScore(playerCards)
  const dealerScore = calculateScore(dealerCards)

  if (playerScore > 21) {
    return "bust"
  }

  if (dealerScore > 21) {
    return "dealerBust"
  }

  if (playerScore === 21 && playerCards.length === 2) {
    if (dealerScore === 21 && dealerCards.length === 2) {
      return "push"
    }
    return "blackjack"
  }

  if (playerScore > dealerScore) {
    return "playerWin"
  }

  if (dealerScore > playerScore) {
    return "dealerWin"
  }

  return "push"
}

// Calculate payout based on result
export function calculatePayout(bet: number, result: GameResult): number {
  switch (result) {
    case "playerWin":
    case "dealerBust":
      return bet * 2 // 1:1 payout
    case "push":
      return bet // Return bet
    case "blackjack":
      return bet * 2.5 // 3:2 payout
    default:
      return 0 // Player loses
  }
}

