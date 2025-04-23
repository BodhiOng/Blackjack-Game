"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dealer } from "./dealer"
import { Player } from "./player"
import { Controls } from "./controls"
import { BetControls } from "./bet-controls"
import { Banner } from "./banner"
import { BalanceDisplay } from "./balance-display"
import { ProvablyFairButton } from "./provably-fair-button"
import { ProvablyFairModal } from "./provably-fair-modal"
import type { ClientGameState, ClientCardType, GameState, GameResult } from "@/lib/types"
import { initializeGame, placeBet, playerHit, playerStand, newRound } from "@/app/api/game/actions"

export default function BlackjackGame() {
  const [gameState, setGameState] = useState<GameState>("betting")
  const [dealerCards, setDealerCards] = useState<ClientCardType[]>([])
  const [playerCards, setPlayerCards] = useState<ClientCardType[]>([])
  const [bet, setBet] = useState(0)
  const [lastBet, setLastBet] = useState(0) // Track the last bet for easy replay
  const [balance, setBalance] = useState(1000)
  const [message, setMessage] = useState("")
  const [dealerScore, setDealerScore] = useState(0)
  const [playerScore, setPlayerScore] = useState(0)
  const [isDealing, setIsDealing] = useState(false)
  const [gameResult, setGameResult] = useState<GameResult>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [playerDrawing, setPlayerDrawing] = useState(false) // Track when player is drawing a card
  const [isProvablyFairModalOpen, setIsProvablyFairModalOpen] = useState(false)
  const [provablyFairData, setProvablyFairData] = useState<{
    gameId: string
    clientSeed: string
    hashedServerSeed: string
    serverSeed: string | null
    nonce: number
    completed: boolean
  } | null>(null)

  // Initialize game on first load
  useEffect(() => {
    async function init() {
      try {
        const newGameState = await initializeGame(1000)
        updateGameStateFromServer(newGameState)
        setIsInitialized(true)
      } catch (error) {
        console.error("Failed to initialize game:", error)
        setMessage("Failed to initialize game. Please refresh the page.")
      }
    }

    if (!isInitialized) {
      init()
    }
  }, [isInitialized])

  // Update client state from server response
  const updateGameStateFromServer = (gameState: ClientGameState) => {
    console.log("Updating client state:", gameState)
    setSessionId(gameState.sessionId)

    // Update dealer cards, preserving the isNew flag
    setDealerCards(gameState.dealerCards)

    // Update player cards, preserving the isNew flag
    setPlayerCards(gameState.playerCards)

    setGameState(gameState.gameState)
    setBalance(gameState.balance)

    // Only update bet if it's not a game over state
    // This allows us to keep the bet amount for the next round
    if (gameState.gameState !== "gameOver") {
      setBet(gameState.bet)
    }

    // Store the last bet when a game is in progress or over
    if (
      gameState.bet > 0 &&
      (gameState.gameState === "playing" || gameState.gameState === "dealerTurn" || gameState.gameState === "gameOver")
    ) {
      setLastBet(gameState.bet)
    }

    setDealerScore(gameState.dealerScore)
    setPlayerScore(gameState.playerScore)
    setGameResult(gameState.gameResult)

    if (gameState.message) {
      setMessage(gameState.message)
    }

    // When transitioning to betting state after a game, automatically set the bet to the last bet
    if (gameState.gameState === "betting" && lastBet > 0 && gameState.bet === 0) {
      setBet(lastBet)
    }

    // Update provably fair data if available
    if (gameState.provablyFair) {
      setProvablyFairData({
        gameId: gameState.provablyFair.gameId,
        clientSeed: gameState.provablyFair.clientSeed,
        hashedServerSeed: gameState.provablyFair.hashedServerSeed,
        serverSeed: gameState.provablyFair.serverSeed || null,
        nonce: gameState.provablyFair.nonce,
        completed: gameState.provablyFair.completed,
      })
    }
  }

  // Place bet and start game
  const startGame = async () => {
    if (bet <= 0) {
      setMessage("Please place a bet")
      return
    }

    if (bet > balance) {
      setMessage("You don't have enough balance for this bet")
      return
    }

    setIsDealing(true)
    setMessage("")
    setPlayerDrawing(false)

    try {
      // If we're in game over state, start a new round first
      if (gameState === "gameOver") {
        await handleNewRound()
      }

      // Pass the sessionId to help recover if session is lost
      const newGameState = await placeBet(bet, sessionId || undefined)
      updateGameStateFromServer(newGameState)
    } catch (error) {
      console.error("Failed to place bet:", error)
      setMessage("Failed to place bet. Please try again.")

      // If we get an error, try to reinitialize the game
      try {
        const newGameState = await initializeGame(balance)
        updateGameStateFromServer(newGameState)
      } catch (reinitError) {
        console.error("Failed to reinitialize game:", reinitError)
      }
    } finally {
      setIsDealing(false)
    }
  }

  // Player hits (takes another card)
  const hit = async () => {
    if (isDealing) return

    setIsDealing(true)
    setPlayerDrawing(true) // Set flag that player is drawing

    try {
      // Add a small delay before drawing the card
      await new Promise((resolve) => setTimeout(resolve, 200))

      const newGameState = await playerHit(sessionId || undefined)
      updateGameStateFromServer(newGameState)

      // Keep the player drawing flag active for a moment to prevent dealer card animation
      setTimeout(() => {
        setPlayerDrawing(false)
      }, 500)
    } catch (error) {
      console.error("Failed to hit:", error)
      setMessage("Failed to hit. Please try again.")
      setPlayerDrawing(false)

      // Try to recover by starting a new game
      if (message.includes("Session expired") || message.includes("Invalid game state")) {
        try {
          const newGameState = await initializeGame(balance)
          updateGameStateFromServer(newGameState)
        } catch (reinitError) {
          console.error("Failed to reinitialize game:", reinitError)
        }
      }
    } finally {
      setIsDealing(false)
    }
  }

  // Player stands (dealer's turn)
  const stand = async () => {
    if (isDealing) return

    setIsDealing(true)
    setPlayerDrawing(false) // Reset flag when standing

    try {
      // Step 1: Initial delay after clicking stand
      setMessage("") // Clear any existing messages
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Step 2: Get the game state from the server
      const newGameState = await playerStand(sessionId || undefined)

      // Step 3: Reveal dealer's hidden card with a visual delay
      // First, create a copy of the dealer's cards with the hidden card still hidden
      const initialDealerCards = [...dealerCards]

      // Then, reveal the hidden card with animation
      if (initialDealerCards.length >= 2 && initialDealerCards[1].hidden) {
        // Find the hidden card in the dealer's hand
        const revealedCards = initialDealerCards.map((card, index) => {
          if (card.hidden) {
            // Find the matching revealed card from the server response
            const revealedCard = newGameState.dealerCards.find((c, i) => i === index)
            if (revealedCard) {
              return {
                ...card,
                hidden: false,
                suit: revealedCard.suit,
                rank: revealedCard.rank,
                isNew: false,
              }
            }
          }
          return card
        })

        // Update the UI to show the revealed card
        setDealerCards(revealedCards)
        setDealerScore(newGameState.dealerScore)

        // Pause to let the player see the revealed card
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Step 4: Check if the game is over (blackjack, bust, etc.)
      if (newGameState.gameState === "gameOver") {
        // Continue with animations before showing results
        await new Promise((resolve) => setTimeout(resolve, 800))
      }

      // Step 5: If dealer needs to draw more cards (score < 17)
      if (newGameState.dealerScore < 17) {
        // Start with the current dealer cards and score
        let currentDealerCards = [...dealerCards]
        let currentDealerScore = newGameState.dealerScore

        // Get all the additional cards the dealer will draw from the server response
        const additionalCards = newGameState.dealerCards.slice(currentDealerCards.length)

        // Draw each card one by one with delays
        for (let i = 0; i < additionalCards.length; i++) {
          // Pause before drawing the card
          await new Promise((resolve) => setTimeout(resolve, 800))

          // Add the new card with the isNew flag for animation
          const newCard: ClientCardType = {
            ...additionalCards[i],
            isNew: true,
          }

          // Update the dealer's hand
          currentDealerCards = [...currentDealerCards, newCard]
          setDealerCards(currentDealerCards)

          // Update the dealer's score
          currentDealerScore = calculateDealerScore(currentDealerCards)
          setDealerScore(currentDealerScore)

          // Pause after drawing the card to let the player see it
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // If dealer has 17 or more, stop drawing
          if (currentDealerScore >= 17) {
            break
          }
        }
      }

      // Step 6: Final pause before showing the result
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Step 7: Update with the final game state
      updateGameStateFromServer(newGameState)
    } catch (error) {
      console.error("Failed to stand:", error)
      setMessage("Failed to stand. Please try again.")

      // Try to recover by starting a new game
      if (message.includes("Session expired") || message.includes("Invalid game state")) {
        try {
          const newGameState = await initializeGame(balance)
          updateGameStateFromServer(newGameState)
        } catch (reinitError) {
          console.error("Failed to reinitialize game:", reinitError)
        }
      }
    } finally {
      setIsDealing(false)
    }
  }

  // Helper function to calculate dealer score
  const calculateDealerScore = (cards: ClientCardType[]): number => {
    let score = 0
    let aces = 0

    for (const card of cards) {
      if (card.hidden) continue

      if (card.rank === "A") {
        aces++
        score += 11
      } else if (["K", "Q", "J"].includes(card.rank || "")) {
        score += 10
      } else if (card.rank) {
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

  // Start a new round
  const handleNewRound = async () => {
    try {
      setPlayerDrawing(false) // Reset flag when starting new round
      const newGameState = await newRound(sessionId || undefined)
      // Don't update the UI yet, we'll do that after placing the bet
      return newGameState
    } catch (error) {
      console.error("Failed to start new round:", error)
      throw error
    }
  }

  // Handle bet change
  const handleBetChange = (newBet: number) => {
    setBet(newBet)
  }

  // Toggle provably fair modal
  const toggleProvablyFairModal = () => {
    setIsProvablyFairModalOpen(!isProvablyFairModalOpen)
  }

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-[600px] max-h-screen overflow-hidden relative px-2 sm:px-4 md:max-w-3xl mx-auto">
      <div className="w-full flex flex-col items-center justify-between p-2 sm:p-4 relative h-full">
        {/* Balance display at the top */}
        <BalanceDisplay balance={balance} />

        {/* Game message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-base sm:text-lg text-center max-w-[90vw] sm:max-w-none"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed height container for the game area to prevent layout shifts */}
        <div className="w-full flex flex-col items-center justify-between flex-grow gap-4">
          {/* Dealer section */}
          <Dealer
            cards={dealerCards}
            score={dealerScore}
            showScore={gameState === "dealerTurn" || gameState === "gameOver"}
            result={gameResult}
            playerDrawing={playerDrawing}
          />

          {/* Banner */}
          <Banner />

          {/* Player section */}
          <Player cards={playerCards} score={playerScore} result={gameResult} />
        </div>

        {/* Controls */}
        <div className="w-full mt-4">
          {gameState === "betting" || gameState === "gameOver" ? (
            <BetControls
              bet={bet}
              setBet={handleBetChange}
              balance={balance}
              onStartGame={startGame}
              isDealing={isDealing}
              isPostGame={gameState === "gameOver"}
            />
          ) : (
            <Controls onHit={hit} onStand={stand} isDealing={isDealing} />
          )}
        </div>

        {/* Provably Fair Button */}
        <div className="w-full mt-4 flex justify-end">
          <ProvablyFairButton onClick={toggleProvablyFairModal} />
        </div>

      </div>

      {/* Provably Fair Modal */}
      <ProvablyFairModal
        isOpen={isProvablyFairModalOpen}
        onClose={() => setIsProvablyFairModalOpen(false)}
        gameData={provablyFairData}
      />
    </div>
  )
}
