"use client"

import { DollarSign } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface BalanceDisplayProps {
  balance: number
  previousBalance?: number
}

export function BalanceDisplay({ balance, previousBalance }: BalanceDisplayProps) {
  const isDecreased = previousBalance !== undefined && balance < previousBalance
  const isIncreased = previousBalance !== undefined && balance > previousBalance

  return (
    <div className="w-full max-w-xs bg-gray-800 rounded-lg p-2.5 flex items-center justify-center mb-3">
      <div className="flex items-center gap-2">
        <div className="bg-green-500 rounded-full p-1.5">
          <DollarSign className="h-3 w-3 text-white" />
        </div>
        <AnimatePresence mode="wait">
          <motion.span 
            key={balance}
            initial={{ opacity: 0, y: isDecreased ? -20 : (isIncreased ? 20 : 0) }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`text-lg font-medium ${isDecreased ? 'text-red-400' : (isIncreased ? 'text-green-400' : 'text-white')}`}
          >
            ${balance.toFixed(2)}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}
