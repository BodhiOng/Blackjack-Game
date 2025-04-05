"use client"

import { motion } from "framer-motion"
import type { ClientCardType } from "@/lib/types"
import { useEffect, useState } from "react"

interface CardProps {
  card: ClientCardType
  index: number
  total: number
  isDealer?: boolean
  result?: "win" | "lose" | "push" | null
  playerDrawing?: boolean
}

export default function Card({
  card,
  index,
  total,
  isDealer = false,
  result = null,
  playerDrawing = false,
}: CardProps) {
  const [borderStyle, setBorderStyle] = useState({})
  const [textColor, setTextColor] = useState({})

  useEffect(() => {
    // Set text color based on suit
    if (card.suit === "hearts" || card.suit === "diamonds") {
      setTextColor({ color: "#e53e3e" }) // Red color
    } else {
      setTextColor({ color: "#000000" }) // Black color
    }

    // Set border based on result
    if (result === "win") {
      setBorderStyle({ border: "2px solid #48bb78" }) // Green border
    } else if (result === "lose") {
      setBorderStyle({ border: "2px solid #f56565" }) // Red border
    } else if (result === "push") {
      setBorderStyle({ border: "2px solid #ecc94b" }) // Yellow border
    } else {
      setBorderStyle({ border: "1px solid #d1d5db" }) // Default gray border
    }
  }, [card.suit, result])

  const getSuitSymbol = (suit?: string) => {
    if (!suit) return ""

    switch (suit) {
      case "hearts":
        return "♥"
      case "diamonds":
        return "♦"
      case "clubs":
        return "♣"
      case "spades":
        return "♠"
      default:
        return ""
    }
  }

  // Calculate spacing from the center - slightly smaller cards
  const cardWidth = 80
  const spacing = 18 // Space between cards
  const totalWidth = cardWidth * total + spacing * (total - 1)
  const startX = -totalWidth / 2 + cardWidth / 2
  const xOffset = startX + index * (cardWidth + spacing)

  // Determine animation based on card properties
  let initialPosition
  let animationDelay = 0

  // If this is a dealer card and player is drawing, don't animate at all
  if (isDealer && playerDrawing) {
    // For dealer cards during player draw, use current position with no animation
    initialPosition = {
      opacity: 1,
      x: xOffset,
      y: 0,
      rotateY: card.hidden ? 180 : 0,
    }
  } else if (card.dealSequence !== undefined) {
    // Initial deal animation - sequence matters
    initialPosition = {
      opacity: 0,
      x: 0, // Start from the middle
      y: isDealer ? -100 : 100,
      rotateY: card.hidden ? 180 : 0,
    }
    animationDelay = card.dealSequence * 0.3 // Sequence the animations
  } else if (card.isNew) {
    // New card being added during gameplay
    initialPosition = {
      opacity: 0,
      x: 0, // Start from the middle
      y: isDealer ? -100 : 100,
      rotateY: card.hidden ? 180 : 0,
    }
    animationDelay = 0.1 // Quick animation for new cards
  } else {
    // Existing card - no animation needed
    initialPosition = {
      opacity: 1,
      x: xOffset,
      y: 0,
      rotateY: card.hidden ? 180 : 0,
    }
  }

  // Modify the motion.div to use a simpler transition for dealer cards during player draws
  return (
    <motion.div
      initial={initialPosition}
      animate={{
        opacity: 1,
        x: xOffset,
        y: 0,
        rotateY: card.hidden ? 180 : 0,
      }}
      transition={{
        type: isDealer && playerDrawing ? "tween" : "spring",
        stiffness: isDealer && playerDrawing ? undefined : 300,
        damping: isDealer && playerDrawing ? undefined : 20,
        duration: isDealer && playerDrawing ? 0 : undefined,
        delay: isDealer && playerDrawing ? 0 : animationDelay,
      }}
      className="absolute"
      style={{ zIndex: index }}
    >
      <div className="relative w-[80px] h-[120px] rounded-lg overflow-hidden perspective-500">
        <motion.div
          className="w-full h-full relative preserve-3d"
          initial={{ rotateY: card.hidden ? 180 : 0 }}
          animate={{ rotateY: card.hidden ? 180 : 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Front of card */}
          <div
            className="absolute w-full h-full backface-hidden bg-white rounded-lg shadow-md p-2 flex flex-col justify-between"
            style={borderStyle}
          >
            {!card.hidden && (
              <>
                <div className="flex justify-between items-start">
                  <div className="text-lg font-bold" style={textColor}>
                    {card.rank}
                  </div>
                  <div className="text-lg" style={textColor}>
                    {getSuitSymbol(card.suit)}
                  </div>
                </div>

                <div className="text-3xl flex justify-center items-center" style={textColor}>
                  {getSuitSymbol(card.suit)}
                </div>

                <div className="flex justify-between items-end">
                  <div className="text-lg" style={textColor}>
                    {getSuitSymbol(card.suit)}
                  </div>
                  <div className="text-lg font-bold" style={textColor}>
                    {card.rank}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Back of card */}
          <div className="absolute w-full h-full backface-hidden rotateY-180 bg-gray-800 border border-gray-700 rounded-lg">
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-[80%] h-[80%] border-4 border-gray-600 rounded-md flex items-center justify-center">
                <div className="w-[70%] h-[70%] bg-gray-700 rounded-md flex items-center justify-center">
                  <div className="text-white text-xl font-bold">♠♥♣♦</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

