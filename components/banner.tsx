export function Banner() {
  return (
    <div className="relative w-full flex flex-col items-center my-3">
      <div className="relative w-full max-w-xs">
        <div className="absolute inset-0 bg-gray-800 skew-x-[-20deg] transform origin-top-right"></div>
        <div className="relative z-10 text-center py-0.5 text-gray-400 text-xs font-medium">BLACKJACK PAYS 3 TO 2</div>
      </div>

      <div className="relative w-full max-w-xs mt-1">
        <div className="absolute inset-0 bg-gray-800 skew-x-[-20deg] transform origin-top-right"></div>
        <div className="relative z-10 text-center py-0.5 text-gray-400 text-xs font-medium">INSURANCE PAYS 2 TO 1</div>
      </div>
    </div>
  )
}

