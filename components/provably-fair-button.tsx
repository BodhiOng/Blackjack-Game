"use client"

import { Check } from "lucide-react"

interface ProvablyFairButtonProps {
  onClick: () => void
}

export function ProvablyFairButton({ onClick }: ProvablyFairButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 right-4 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white text-sm font-medium py-1.5 px-3 rounded-md flex items-center transition-all"
    >
      Provably Fair
      <Check size={16} className="ml-1 text-green-500" />
    </button>
  )
}

