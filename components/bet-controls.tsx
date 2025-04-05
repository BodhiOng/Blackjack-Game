"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DollarSign } from "lucide-react"

interface BetControlsProps {
  bet: number
  setBet: (bet: number) => void
  balance: number
  onStartGame: () => void
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
    const value = e.target.value
    setInputValue(value)
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0) {
      setBet(numValue)
    } else {
      setBet(0)
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (inputValue === "0" || inputValue === "0.00") {
      setInputValue("")
    }
  }

  const adjustBet = (multiplier: number) => {
    const newBet = bet * multiplier
    setBet(newBet)
    setInputValue(newBet.toFixed(2))
  }

  const isValidBet = bet > 0 && bet <= balance && !isDealing

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
        onClick={onStartGame}
        disabled={!isValidBet}
        className={`w-full max-w-xs ${isValidBet ? "bg-green-600 hover:bg-green-500" : "bg-gray-700"} disabled:cursor-not-allowed text-white py-2 rounded-lg font-bold text-base transition-all ${isPostGame ? "animate-pulse" : ""}`}
      >
        {buttonText}
      </button>
    </div>
  )
}

