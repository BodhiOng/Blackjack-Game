"use client"

import { Check } from "lucide-react"

interface ProvablyFairButtonProps {
  onClick: () => void
}

export function ProvablyFairButton({ onClick }: ProvablyFairButtonProps) {
  return (
    <button
      onClick={onClick}
      className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 px-4 rounded-md flex items-center transition-all shadow-md border border-gray-700 hover:border-green-500"
    >
      Provably Fair
      <Check size={16} className="ml-2 text-green-500" />
    </button>
  )
}
