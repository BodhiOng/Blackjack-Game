"use client"

import { ArrowDown, Hand } from "lucide-react"

interface ControlsProps {
  onHit: () => void
  onStand: () => void
  isDealing: boolean
}

export function Controls({ onHit, onStand, isDealing }: ControlsProps) {
  return (
    <div className="w-full flex flex-col items-center gap-2 mt-3">
      <div className="w-full max-w-xs grid grid-cols-2 gap-2">
        <button
          onClick={onHit}
          disabled={isDealing}
          className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium transition-all"
        >
          <span>Hit</span>
          <ArrowDown className="text-green-500 h-4 w-4" />
        </button>

        <button
          onClick={onStand}
          disabled={isDealing}
          className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium transition-all"
        >
          <span>Stand</span>
          <Hand className="text-red-500 h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

