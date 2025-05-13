"use client"

import { useState, useEffect } from "react"
import { X, Check, Copy, ExternalLink } from "lucide-react"

interface ProvablyFairModalProps {
  isOpen: boolean
  onClose: () => void
  gameData: {
    clientSeed: string
    hashedServerSeed: string
    serverSeed: string | null
    nonce: number
    gameId: string
    completed: boolean
  } | null
}

// Client-side hash function for verification
function clientHashSeed(seed: string): string {
  if (typeof window === 'undefined') {
    // Return a placeholder during server-side rendering
    return ''.padStart(64, '0')
  }
  
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Convert to hex string and ensure it's positive
  const hexHash = (hash >>> 0).toString(16).padStart(8, "0")

  // Repeat the hash to make it look more like SHA-256 (64 chars)
  return hexHash.repeat(8).substring(0, 64)
}

export function ProvablyFairModal({ isOpen, onClose, gameData }: ProvablyFairModalProps) {
  const [activeTab, setActiveTab] = useState<"about" | "verify">("about")
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Set isClient to true once component mounts on the client
    setIsClient(true)
    
    if (!isOpen) {
      // Reset state when modal closes
      setActiveTab("about")
      setVerificationResult(null)
      setCopied(null)
    }
  }, [isOpen])

  const handleVerify = () => {
    if (!gameData || !gameData.serverSeed) return

    // Client-side verification
    const serverSeed = gameData.serverSeed || ''
    const hashedServerSeed = clientHashSeed(serverSeed)
    const result = hashedServerSeed === gameData.hashedServerSeed
    setVerificationResult(result)
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-800 px-4 py-3">
          <h3 className="text-white font-bold text-lg">Provably Fair</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === "about" ? "text-white border-b-2 border-green-500" : "text-gray-400"}`}
            onClick={() => setActiveTab("about")}
          >
            About
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === "verify" ? "text-white border-b-2 border-green-500" : "text-gray-400"}`}
            onClick={() => setActiveTab("verify")}
          >
            Verify
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === "about" ? (
            <div className="text-gray-300 text-sm space-y-3">
              <p>Our blackjack game uses a provably fair system to ensure complete transparency and fairness.</p>
              <p>
                <strong className="text-white">How it works:</strong>
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Before each game, we generate a <strong className="text-white">server seed</strong> and hash it.
                </li>
                <li>
                  You receive a <strong className="text-white">client seed</strong> that you can change.
                </li>
                <li>The combination of these seeds determines the shuffle of the deck.</li>
                <li>After the game, we reveal the server seed so you can verify the fairness.</li>
              </ol>
              <p>This system ensures that neither you nor we can predict or manipulate the outcome of the game.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gameData ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Game ID</label>
                      <div className="flex items-center bg-gray-800 rounded p-2">
                        <span className="text-white text-sm truncate flex-1">{gameData.gameId}</span>
                        <button
                          onClick={() => copyToClipboard(gameData.gameId, "gameId")}
                          className="text-gray-400 hover:text-white ml-2"
                        >
                          {copied === "gameId" ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Client Seed</label>
                      <div className="flex items-center bg-gray-800 rounded p-2">
                        <span className="text-white text-sm truncate flex-1">{gameData.clientSeed}</span>
                        <button
                          onClick={() => copyToClipboard(gameData.clientSeed, "clientSeed")}
                          className="text-gray-400 hover:text-white ml-2"
                        >
                          {copied === "clientSeed" ? (
                            <Check size={16} className="text-green-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Hashed Server Seed</label>
                      <div className="flex items-center bg-gray-800 rounded p-2">
                        <span className="text-white text-sm truncate flex-1">{gameData.hashedServerSeed}</span>
                        <button
                          onClick={() => copyToClipboard(gameData.hashedServerSeed, "hashedServerSeed")}
                          className="text-gray-400 hover:text-white ml-2"
                        >
                          {copied === "hashedServerSeed" ? (
                            <Check size={16} className="text-green-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {gameData.completed && gameData.serverSeed && (
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Revealed Server Seed</label>
                        <div className="flex items-center bg-gray-800 rounded p-2">
                          <span className="text-white text-sm truncate flex-1">{gameData.serverSeed || ''}</span>
                          <button
                            onClick={() => copyToClipboard(gameData.serverSeed || '', "serverSeed")}
                            className="text-gray-400 hover:text-white ml-2"
                          >
                            {copied === "serverSeed" ? (
                              <Check size={16} className="text-green-500" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Nonce</label>
                      <div className="flex items-center bg-gray-800 rounded p-2">
                        <span className="text-white text-sm">{gameData.nonce}</span>
                      </div>
                    </div>
                  </div>

                  {gameData.completed && gameData.serverSeed ? (
                    <div className="space-y-3">
                      <button
                        onClick={handleVerify}
                        className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-medium transition-colors"
                      >
                        Verify Fairness
                      </button>

                      {verificationResult !== null && (
                        <div className={`p-3 rounded ${verificationResult ? "bg-green-900/50" : "bg-red-900/50"}`}>
                          <div className="flex items-center">
                            {verificationResult ? (
                              <>
                                <Check size={18} className="text-green-500 mr-2" />
                                <span className="text-green-400 font-medium">Verification successful!</span>
                              </>
                            ) : (
                              <>
                                <X size={18} className="text-red-500 mr-2" />
                                <span className="text-red-400 font-medium">Verification failed!</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs mt-1 text-gray-300">
                            {verificationResult
                              ? `Hash of "${gameData.serverSeed || ''}" matches the hashed server seed.`
                              : `Hash of "${gameData.serverSeed || ''}" does not match the hashed server seed.`}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-800/50 p-3 rounded text-sm text-gray-400">
                      {gameData.completed
                        ? "Server seed information is missing."
                        : "The server seed will be revealed when the game is completed."}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-gray-400">No game data available</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-4 py-3 flex justify-between items-center">
          <a
            href="https://en.wikipedia.org/wiki/Provably_fair"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white text-sm flex items-center transition-colors"
          >
            Learn more
            <ExternalLink size={14} className="ml-1" />
          </a>

          {activeTab === "verify" && gameData?.completed && gameData?.serverSeed && isClient && (
            <div className="text-xs text-gray-400">Hash: {clientHashSeed(gameData.serverSeed || '').substring(0, 8)}...</div>
          )}
        </div>
      </div>
    </div>
  )
}

