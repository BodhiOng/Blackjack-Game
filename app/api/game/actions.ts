"use server"

import { getSession, createSession, updateSession } from "@/lib/session-utils"
import {
  createDeck,
  createProvablyFairDeck,
  calculateScore,
  convertToClientCards,
  determineGameResult,
  calculatePayout,
} from "@/lib/game-logic"
import { generateSeed, hashSeed } from "@/lib/provably-fair"
import type { ClientGameState, GameSession, ProvablyFairData } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"
import { cookies } from "next/headers"

// Debug function to log session state
function logSessionState(action: string, session: GameSession | null) {
  console.log(
    `[${action}] Session:`,
    session
      ? {
          id: session.id,
          gameState: session.gameState,
          balance: session.balance,
          bet: session.bet,
          dealerCards: session.dealerCards.length,
          playerCards: session.playerCards.length,
          gameResult: session.gameResult,
          provablyFair: session.provablyFair
            ? {
                gameId: session.provablyFair.gameId,
                completed: session.provablyFair.completed,
              }
            : null,
        }
      : "null",
  )
}

// Create client game state with only the information the client should see
async function createClientGameState(
  session: GameSession,
  markNewCard = false,
  isInitialDeal = false,
  hideDealer = false,
): Promise<ClientGameState> {
  // Create provably fair data for client
  const provablyFairData = session.provablyFair
    ? {
        gameId: session.provablyFair.gameId,
        clientSeed: session.provablyFair.clientSeed,
        hashedServerSeed: session.provablyFair.hashedServerSeed,
        serverSeed: session.provablyFair.completed ? session.provablyFair.serverSeed : null,
        nonce: session.provablyFair.nonce,
        completed: session.provablyFair.completed,
      }
    : undefined

  // If hideDealer is true, keep existing dealer cards without updating them
  const dealerCards = hideDealer
    ? await convertToClientCards(session.dealerCards.map((card) => ({ ...card, hidden: true })), false, false, true)
    : await convertToClientCards(session.dealerCards, markNewCard, isInitialDeal, true)

  const playerCards = await convertToClientCards(session.playerCards, markNewCard, isInitialDeal, false)
  const dealerScore = hideDealer ? 0 : await calculateScore(session.dealerCards.map((card) => (card.hidden ? { ...card, hidden: false } : card)))
  const playerScore = await calculateScore(session.playerCards)

  return {
    sessionId: session.id,
    dealerCards,
    playerCards,
    gameState: session.gameState,
    balance: session.balance,
    bet: session.bet,
    dealerScore,
    playerScore,
    gameResult: session.gameResult,
    message: "",
    provablyFair: provablyFairData,
  }
}

// Initialize a new game
export async function initializeGame(initialBalance = 1000): Promise<ClientGameState> {
  // Clear any existing session
  const cookieStore = await cookies()
  cookieStore.delete("blackjack_session")

  // Create provably fair data
  const gameId = uuidv4()
  const serverSeed = await generateSeed(32)
  const hashedServerSeed = await hashSeed(serverSeed)
  const clientSeed = await generateSeed(16)
  const nonce = 0

  const provablyFairData: ProvablyFairData = {
    gameId,
    serverSeed,
    hashedServerSeed,
    clientSeed,
    nonce,
    completed: false,
  }

  const session: GameSession = {
    id: uuidv4(),
    deck: [], // We'll create the deck when placing a bet
    dealerCards: [],
    playerCards: [],
    gameState: "betting",
    balance: initialBalance,
    bet: 0,
    gameResult: null,
    provablyFair: provablyFairData,
  }

  await createSession(session)
  logSessionState("initializeGame", session)
  return await createClientGameState(session)
}

// Place a bet and start the game
export async function placeBet(bet: number, sessionId?: string): Promise<ClientGameState> {
  let session = await getSession()
  logSessionState("placeBet-before", session)

  // If no session found but sessionId is provided, create a new session
  if (!session && sessionId) {
    // Create provably fair data
    const gameId = uuidv4()
    const serverSeed = await generateSeed(32)
    const hashedServerSeed = await hashSeed(serverSeed)
    const clientSeed = await generateSeed(16)
    const nonce = 0

    const provablyFairData: ProvablyFairData = {
      gameId,
      serverSeed,
      hashedServerSeed,
      clientSeed,
      nonce,
      completed: false,
    }

    session = {
      id: sessionId,
      deck: [],
      dealerCards: [],
      playerCards: [],
      gameState: "betting",
      balance: 1000,
      bet: 0,
      gameResult: null,
      provablyFair: provablyFairData,
    }

    await createSession(session)
  }

  if (!session) {
    // If no session, create a new one
    return initializeGame()
  }

  // Validate bet amount
  if (bet <= 0 || bet > session.balance) {
    return {
      ...(await createClientGameState(session)),
      message: "Invalid bet amount",
    }
  }

  // Create a new deck for this game
  if (session.provablyFair) {
    // Use provably fair deck generation
    const provablyFairDeck = await createProvablyFairDeck(
      session.provablyFair.serverSeed,
      session.provablyFair.clientSeed,
    )
    session.deck = provablyFairDeck
  } else {
    // Use regular deck generation
    const regularDeck = await createDeck()
    session.deck = regularDeck
  }

  // Deal initial cards
  session.dealerCards = [
    session.deck.pop()!,
    { ...session.deck.pop()!, hidden: true }, // Second dealer card is hidden
  ]
  session.playerCards = [session.deck.pop()!, session.deck.pop()!]

  // Update game state
  session.gameState = "playing"
  session.bet = bet
  session.balance -= bet
  session.gameResult = null

  await updateSession(session)
  logSessionState("placeBet-after", session)

  // Return initial game state with animation flags for initial deal
  return await createClientGameState(session, false, true)
}

// Player hits (takes another card)
export async function playerHit(sessionId?: string): Promise<ClientGameState> {
  const session = await getSession()
  logSessionState("playerHit-before", session)

  if (!session) {
    return {
      sessionId: "",
      dealerCards: [],
      playerCards: [],
      gameState: "betting",
      balance: 1000,
      bet: 0,
      dealerScore: 0,
      playerScore: 0,
      gameResult: null,
      message: "Session expired. Please start a new game.",
    }
  }

  // Validate game state
  if (session.gameState !== "playing") {
    return {
      ...(await createClientGameState(session)),
      message: "Invalid game state for hit action",
    }
  }

  // Draw a card
  const newCard = session.deck.pop()!
  session.playerCards.push(newCard)

  // Check for bust
  const playerScore = await calculateScore(session.playerCards)
  if (playerScore > 21) {
    session.gameResult = "bust"
    session.gameState = "gameOver"
  }

  await updateSession(session)
  logSessionState("playerHit-after", session)

  return await createClientGameState(session, true, false, false)
}

// Player stands (dealer's turn)
export async function playerStand(sessionId?: string): Promise<ClientGameState> {
  const session = await getSession()
  logSessionState("playerStand-before", session)

  if (!session) {
    return {
      sessionId: "",
      dealerCards: [],
      playerCards: [],
      gameState: "betting",
      balance: 1000,
      bet: 0,
      dealerScore: 0,
      playerScore: 0,
      gameResult: null,
      message: "Session expired. Please start a new game.",
    }
  }

  // Force the game state to playing if it has valid cards but wrong state
  if (session.gameState !== "playing") {
    if (session.playerCards.length > 0 && session.dealerCards.length > 0 && !session.gameResult) {
      session.gameState = "playing"
      await updateSession(session)
    } else {
      return {
        ...(await createClientGameState(session)),
        message: "Invalid game state for stand action. Please start a new game.",
      }
    }
  }

  // Reveal dealer's hidden card
  session.dealerCards = session.dealerCards.map((card) => ({ ...card, hidden: false }))
  session.gameState = "dealerTurn"

  // First, update the session to show the revealed card
  await updateSession(session)

  // Dealer draws cards until score is 17 or higher
  let dealerScore = await calculateScore(session.dealerCards)
  let lastGameState = await createClientGameState(session, true)

  while (dealerScore < 17) {
    const newCard = session.deck.pop()!
    session.dealerCards.push(newCard)

    // Update the session after each card is drawn
    await updateSession(session)

    // Get the updated dealer score
    dealerScore = await calculateScore(session.dealerCards)

    // Return the intermediate state with the new card marked for animation
    lastGameState = await createClientGameState(session, true)
  }

  // Determine game result
  session.gameResult = await determineGameResult(session.playerCards, session.dealerCards)
  session.gameState = "gameOver"

  // Update balance based on result
  if (session.gameResult !== "dealerWin" && session.gameResult !== "bust") {
    session.balance += await calculatePayout(session.bet, session.gameResult)
  }

  // Mark the game as completed for provably fair verification
  if (session.provablyFair) {
    session.provablyFair.completed = true
  }

  await updateSession(session)
  logSessionState("playerStand-after", session)

  // Return the final state
  return await createClientGameState(session, false)
}

// Start a new round (after game over)
export async function newRound(sessionId?: string): Promise<ClientGameState> {
  const session = await getSession()
  logSessionState("newRound-before", session)

  // If no session found but sessionId is provided, try to recover
  if (!session && sessionId) {
    // Create a new session with the provided ID
    return {
      sessionId: "",
      dealerCards: [],
      playerCards: [],
      gameState: "betting",
      balance: 1000,
      bet: 0,
      dealerScore: 0,
      playerScore: 0,
      gameResult: null,
      message: "Session expired. Please start a new game.",
    }
  }

  if (!session) {
    // If no session, create a new one
    return initializeGame()
  }

  // Save the current bet amount for convenience
  const currentBet = session.bet

  // Reset game state
  session.gameState = "betting"
  session.bet = 0 // Reset bet to 0 so client can set it
  session.gameResult = null
  session.dealerCards = []
  session.playerCards = []

  // Create new provably fair data for the new game
  if (session.provablyFair) {
    const gameId = uuidv4()
    const serverSeed = await generateSeed(32)
    const hashedServerSeed = await hashSeed(serverSeed)
    const clientSeed = await generateSeed(16)
    const nonce = 0

    session.provablyFair = {
      gameId,
      serverSeed,
      hashedServerSeed,
      clientSeed,
      nonce,
      completed: false,
    }
  }

  await updateSession(session)
  logSessionState("newRound-after", session)

  // Return the client game state
  const clientState = await createClientGameState(session)

  // Include the last bet in the response for the client to use
  return {
    ...clientState,
    bet: currentBet, // This helps the client remember the last bet
  }
}
