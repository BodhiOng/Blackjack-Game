"use client"
import Card from "./card"
import type { ClientCardType } from "@/lib/types"
import { useEffect, useState } from "react"

interface DealerProps {
  cards: ClientCardType[]
  score: number
  showScore: boolean
  result?: "playerWin" | "dealerWin" | "push" | "bust" | "dealerBust" | "blackjack" | null
  playerDrawing?: boolean
}

export function Dealer({ cards, score, showScore, result = null, playerDrawing = false }: DealerProps) {
  const [cardResult, setCardResult] = useState<"win" | "lose" | "push" | null>(null)

  useEffect(() => {
    // Set card result based on game result
    if (!result) {
      setCardResult(null)
      return
    }

    if (result === "playerWin" || result === "bust" || result === "blackjack") {
      setCardResult("lose")
    } else if (result === "dealerWin" || result === "dealerBust") {
      setCardResult("win")
    } else if (result === "push") {
      setCardResult("push")
    }
  }, [result])

  return (
    <div className="w-full flex flex-col items-center justify-center h-[25%] relative">
      {/* Score bubble container with fixed height to prevent layout shifts */}
      <div className="h-8 flex items-center justify-center mb-2">
        {score > 0 ? (
          <div className="px-4 py-1 rounded-full text-white text-base font-medium bg-gray-800/80 z-10">
            {showScore ? score : "?"}
          </div>
        ) : (
          <div className="invisible px-4 py-1 rounded-full text-white text-base font-medium">
            {/* Placeholder to maintain height */}
            00
          </div>
        )}
      </div>

      <div className="relative h-[120px] w-full flex items-center justify-center mb-4">
        {cards.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            index={index}
            total={cards.length}
            isDealer={true}
            result={cardResult}
            playerDrawing={playerDrawing}
          />
        ))}
      </div>
    </div>
  )
}

