"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DollarSign } from "lucide-react"

interface BetControlsProps {
  bet: number
  setBet: (bet: number) => void
  balance: number
  onStartGame: (betAmount?: number) => void
  isDealing: boolean
  isPostGame: boolean
}

export function BetControls({ bet, setBet, balance, onStartGame, isDealing, isPostGame }: BetControlsProps) {
  const [inputValue, setInputValue] = useState(bet > 0 ? bet.toString() : "")

  // Update input value when bet changes (for post-game scenarios)
  useEffect(() => {
    if (bet > 0) {
      setInputValue(bet.toString())
    }
  }, [bet])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only update the local input value, not the actual bet
    setInputValue(e.target.value)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (inputValue === "0" || inputValue === "0.00") {
      setInputValue("")
    }
  }

  const adjustBet = (multiplier: number) => {
    // Use the current input value for multiplication instead of the bet state
    const currentValue = Number.parseFloat(inputValue) || 0
    const newBet = currentValue * multiplier
    // Update the local input value
    setInputValue(newBet.toFixed(2))
  }

  // Handle start game and set bet at the same time
  const handleStartGame = () => {
    // Parse the input value to a number
    const numValue = Number.parseFloat(inputValue)
    
    // Only update the bet if it's a valid number and within balance
    if (!isNaN(numValue) && numValue > 0 && numValue <= balance) {
      // Pass the bet value directly to the startGame function
      onStartGame(numValue)
    }
  }

  // Check if the input value is a valid bet (for enabling/disabling the button)
  const parsedValue = Number.parseFloat(inputValue)
  const isValidBet = !isNaN(parsedValue) && parsedValue > 0 && parsedValue <= balance && !isDealing

  // Determine button text based on whether we're starting a new game or continuing
  const buttonText = isPostGame ? "Play Again" : "Bet"

  return (
    <div className="w-full flex flex-col items-center gap-2 mt-3">
      <div className="w-full max-w-xs">
        <div className="text-gray-400 text-xs mb-1">Bet Amount</div>
      </div>

      <div className="w-full max-w-xs bg-gray-800 rounded-lg p-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 rounded-full p-1.5">
            <DollarSign className="h-3 w-3 text-white" />
          </div>
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            className="bg-transparent text-white text-base font-medium w-28 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustBet(0.5)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-0.5 rounded-md text-sm"
          >
            ½
          </button>
          <button
            onClick={() => adjustBet(2)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-0.5 rounded-md text-sm"
          >
            2×
          </button>
        </div>
      </div>

      <button
        onClick={handleStartGame}
        disabled={!isValidBet}
        className={`w-full max-w-xs ${isValidBet ? "bg-green-600 hover:bg-green-500" : "bg-gray-700"} disabled:cursor-not-allowed text-white py-2 rounded-lg font-bold text-base transition-all ${isPostGame ? "animate-pulse" : ""}`}
      >
        {buttonText}
      </button>
    </div>
  )
}
