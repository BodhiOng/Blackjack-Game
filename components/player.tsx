"use client"
import Card from "./card"
import type { ClientCardType } from "@/lib/types"
import { useEffect, useState } from "react"

interface PlayerProps {
  cards: ClientCardType[]
  score: number
  result: "playerWin" | "dealerWin" | "push" | "bust" | "dealerBust" | "blackjack" | null
}

export function Player({ cards, score, result }: PlayerProps) {
  const [cardResult, setCardResult] = useState<"win" | "lose" | "push" | null>(null)
  const [bubbleStyle, setBubbleStyle] = useState("")

  useEffect(() => {
    // Set card result based on game result
    if (!result) {
      setCardResult(null)
      setBubbleStyle("bg-gray-800/80")
      return
    }

    if (result === "bust" || result === "dealerWin") {
      setCardResult("lose")
      setBubbleStyle("bg-red-500/80")
    } else if (["playerWin", "dealerBust", "blackjack"].includes(result)) {
      setCardResult("win")
      setBubbleStyle("bg-green-500/80")
    } else if (result === "push") {
      setCardResult("push")
      setBubbleStyle("bg-yellow-500/80")
    }
  }, [result])

  return (
    <div className="w-full flex flex-col items-center justify-center h-[25%] relative">
      <div className="relative h-[120px] w-full flex items-center justify-center mt-4">
        {cards.map((card, index) => (
          <Card key={card.id} card={card} index={index} total={cards.length} result={cardResult} />
        ))}
      </div>

      {/* Score bubble container with fixed height to prevent layout shifts */}
      <div className="h-8 flex items-center justify-center mt-2 mb-4">
        {score > 0 ? (
          <div className={`px-4 py-1 rounded-full text-white text-base font-medium ${bubbleStyle}`}>{score}</div>
        ) : (
          <div className="invisible px-4 py-1 rounded-full text-white text-base font-medium">
            {/* Placeholder to maintain height */}
            00
          </div>
        )}
      </div>
    </div>
  )
}

