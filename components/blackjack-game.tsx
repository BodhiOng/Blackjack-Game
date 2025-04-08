"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dealer } from "./dealer"
import { Player } from "./player"
import { Controls } from "./controls"
import { BetControls } from "./bet-controls"
import { Banner } from "./banner"
import { BalanceDisplay } from "./balance-display"
import { ProvablyFairModal } from "./provably-fair-modal"
import type { ClientGameState, ClientCardType, GameState, GameResult } from "@/lib/types"
import { initializeGame, placeBet, playerHit, playerStand, newRound } from "@/app/api/game/actions"
import { Check } from "lucide-react"

export default function BlackjackGame() {
  const [gameState, setGameState] = useState<GameState>("betting")
  const [dealerCards, setDealerCards] = useState<ClientCardType[]>([])
  const [playerCards, setPlayerCards] = useState<ClientCardType[]>([])
  const [bet, setBet] = useState(0)
  const [lastBet, setLastBet] = useState(0) // Track the last bet for easy replay
  const [balance, setBalance] = useState(1000)
  const [previousBalance, setPreviousBalance] = useState<number | undefined>(undefined)
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
  const [isMobile, setIsMobile] = useState(false)

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

    // Update dealer cards, preserving the hidden flag
    setDealerCards(gameState.dealerCards)

    // Update player cards, preserving the hidden flag
    setPlayerCards(gameState.playerCards)

    setGameState(gameState.gameState)
    
    // Track previous balance before updating to new balance
    setPreviousBalance(balance)
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
  const startGame = async (betAmount?: number) => {
    // Use the passed betAmount if provided, otherwise use the state value
    const currentBet = betAmount !== undefined ? betAmount : bet
    
    if (currentBet <= 0) {
      setMessage("Please place a bet")
      return
    }

    if (currentBet > balance) {
      setMessage("You don't have enough balance for this bet")
      return
    }

    // Update the bet state if it was passed as a parameter
    if (betAmount !== undefined) {
      setBet(currentBet)
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
      const newGameState = await placeBet(currentBet, sessionId || undefined)
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
    if (gameState !== "playing") {
      return
    }

    setIsDealing(true)
    setPlayerDrawing(true)
    setMessage("")

    try {
      const newGameState = await playerHit(sessionId || undefined)
      updateGameStateFromServer(newGameState)

      // If player busts, show result after a short delay
      if (newGameState.gameResult === "bust") {
        setTimeout(() => {
          setGameResult("bust")
        }, 1000)
      }
    } catch (error) {
      console.error("Failed to hit:", error)
      setMessage("Failed to hit. Please try again.")

      // If we get an error, try to reinitialize the game
      try {
        const newGameState = await initializeGame(balance)
        updateGameStateFromServer(newGameState)
      } catch (reinitError) {
        console.error("Failed to reinitialize game:", reinitError)
      }
    } finally {
      setIsDealing(false)
      setPlayerDrawing(false)
    }
  }

  // Player stands (dealer's turn)
  const stand = async () => {
    if (gameState !== "playing") {
      return
    }

    setIsDealing(true)
    setMessage("")

    try {
      const initialGameState = await playerStand(sessionId || undefined)
      updateGameStateFromServer(initialGameState)

      // Simulate dealer drawing cards one by one
      if (initialGameState.gameState === "dealerTurn") {
        let currentDealerCards = [...initialGameState.dealerCards]
        let currentDealerScore = calculateDealerScore(currentDealerCards)

        // Process each dealer card with a delay
        for (let i = 1; i < initialGameState.dealerCards.length; i++) {
          // Skip the first card which is already revealed
          if (i <= 1) continue

          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Update dealer cards one by one
          const updatedDealerCards = currentDealerCards.map((card, index) => {
            if (index === i) {
              return { ...card, hidden: false }
            }
            return card
          })

          currentDealerCards = updatedDealerCards
          setDealerCards(updatedDealerCards)

          // Update dealer score
          currentDealerScore = calculateDealerScore(
            updatedDealerCards.filter((card) => !card.hidden)
          )
          setDealerScore(currentDealerScore)

          // Check if dealer busts
          if (currentDealerScore > 21) {
            // Dealer busts, player wins
            setGameResult("dealerBust")
            break
          }
        }

        // Final result determination after dealer finishes drawing
        if (currentDealerScore <= 21) {
          await new Promise((resolve) => setTimeout(resolve, 1000))

          if (playerScore > currentDealerScore) {
            // Player score is higher, player wins
            setGameResult("playerWin")
          } else if (playerScore < currentDealerScore) {
            // Dealer score is higher, dealer wins
            setGameResult("dealerWin")
          } else {
            // Scores are equal, it's a push
            setGameResult("push")
          }
        }

        // Update game state to game over after determining result
        setGameState("gameOver")

        // Update balance based on result
        let newBalance = balance
        if (
          gameResult === "playerWin" ||
          gameResult === "dealerBust" ||
          gameResult === "blackjack"
        ) {
          // Player wins, add bet amount (2x for blackjack)
          const multiplier = gameResult === "blackjack" ? 2.5 : 2
          newBalance += bet * multiplier
        } else if (gameResult === "push") {
          // Push, return bet amount
          newBalance += bet
        }
        // For dealer win or player bust, bet is already deducted

        setBalance(newBalance)
      }
    } catch (error) {
      console.error("Failed to stand:", error)
      setMessage("Failed to stand. Please try again.")

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

  // Helper function to calculate dealer score
  const calculateDealerScore = (cards: ClientCardType[]): number => {
    const revealedCards = cards.filter((card) => !card.hidden)
    let score = 0
    let aces = 0

    for (const card of revealedCards) {
      if (card.rank === "A") {
        aces++
        score += 11
      } else if (["K", "Q", "J"].includes(card.rank || "")) {
        score += 10
      } else if (card.rank) {
        score += parseInt(card.rank)
      }
    }

    // Adjust for aces if score is over 21
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

  // Handle hit
  const handleHit = hit

  // Handle stand
  const handleStand = stand

  // Toggle provably fair modal
  const toggleProvablyFairModal = () => {
    setIsProvablyFairModalOpen(!isProvablyFairModalOpen)
  }

  // Check for mobile view
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768) // 768px is a common breakpoint for tablets
    }
    
    // Initial check
    checkIfMobile()
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  // Mobile view component
  const MobileView = () => (
    <div className="flex flex-col items-center justify-between w-full h-full bg-gradient-to-b from-gray-900 to-black overflow-hidden relative">
      <div className="w-full flex flex-col items-center justify-between p-3 relative h-full">
        {/* Balance display at the top */}
        <div className="w-full flex justify-between items-center mb-2">
          <div className="w-1/2 flex justify-start">
            <BalanceDisplay balance={balance} previousBalance={previousBalance} />
          </div>
          <div className="w-1/2 flex justify-end">
            <button
              onClick={toggleProvablyFairModal}
              className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white text-sm font-medium py-1 px-2 rounded-md flex items-center transition-all"
            >
              Provably Fair
              <Check size={14} className="ml-1 text-green-500" />
            </button>
          </div>
        </div>

        {/* Game message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 bg-black/90 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed height container for the game area to prevent layout shifts */}
        <div className="w-full flex flex-col items-center justify-between flex-grow">
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
        <div className="w-full mt-2 flex justify-center flex-col items-center">
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
            <Controls onHit={handleHit} onStand={handleStand} isDealing={isDealing} />
          )}
        </div>
      </div>

      {/* Provably Fair Modal */}
      <ProvablyFairModal
        isOpen={isProvablyFairModalOpen}
        onClose={toggleProvablyFairModal}
        gameData={provablyFairData}
      />
    </div>
  )

  // Desktop view component
  const DesktopView = () => (
    <div className="flex flex-col items-center justify-between w-full max-w-4xl bg-gradient-to-b from-gray-900 to-black rounded-xl shadow-2xl overflow-hidden h-full relative border border-gray-800">
      <div className="w-full flex flex-col items-center justify-between p-6 relative h-full">
        {/* Balance display at the top */}
        <div className="w-full flex justify-between items-center mb-4">
          <div className="w-1/3"></div> {/* Spacer for alignment */}
          <div className="w-1/3 flex justify-center">
            <BalanceDisplay balance={balance} previousBalance={previousBalance} />
          </div>
          <div className="w-1/3 flex justify-end">
            <button
              onClick={toggleProvablyFairModal}
              className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white text-sm font-medium py-1.5 px-3 rounded-md flex items-center transition-all"
            >
              Provably Fair
              <Check size={16} className="ml-1 text-green-500" />
            </button>
          </div>
        </div>

        {/* Game message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 bg-black/90 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg border border-green-500"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed height container for the game area to prevent layout shifts */}
        <div className="w-full flex flex-col items-center justify-between flex-grow bg-gradient-to-b from-green-900/20 to-green-800/10 rounded-xl p-4">
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
        <div className="w-full mt-6 flex justify-center">
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
            <Controls onHit={handleHit} onStand={handleStand} isDealing={isDealing} />
          )}
        </div>
      </div>

      {/* Provably Fair Modal */}
      <ProvablyFairModal
        isOpen={isProvablyFairModalOpen}
        onClose={toggleProvablyFairModal}
        gameData={provablyFairData}
      />
    </div>
  )

  return isMobile ? <MobileView /> : <DesktopView />
}
