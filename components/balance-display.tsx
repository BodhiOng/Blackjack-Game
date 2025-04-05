"use client"

import { DollarSign } from "lucide-react"

interface BalanceDisplayProps {
  balance: number
}

export function BalanceDisplay({ balance }: BalanceDisplayProps) {
  return (
    <div className="w-full max-w-xs bg-gray-800 rounded-lg p-2.5 flex items-center justify-center mb-3">
      <div className="flex items-center gap-2">
        <div className="bg-green-500 rounded-full p-1.5">
          <DollarSign className="h-3 w-3 text-white" />
        </div>
        <span className="text-white text-lg font-medium">${balance.toFixed(2)}</span>
      </div>
    </div>
  )
}

