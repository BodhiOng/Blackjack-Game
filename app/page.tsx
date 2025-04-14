import BlackjackGame from "@/components/blackjack-game"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-black via-[#1a1a2e] to-[#34344e] p-4">
      <BlackjackGame />
    </main>
  )
}
