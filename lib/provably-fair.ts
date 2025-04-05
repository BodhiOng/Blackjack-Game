"use server"

// Simple hash function for demonstration purposes
// In a production environment, use a proper cryptographic library
export function generateSeed(length = 16): string {
  let result = ""
  const characters = "abcdef0123456789"
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// Simple hash function using string operations
export function hashSeed(seed: string): string {
  // This is a simplified hash function for demonstration
  // In production, use a proper cryptographic hash function
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

// Combine server seed and client seed
export function combineSeeds(serverSeed: string, clientSeed: string, nonce: number): string {
  return hashSeed(`${serverSeed}:${clientSeed}:${nonce}`)
}

// Generate a random number between 0 and 1
export function generateRandomNumber(combinedSeed: string): number {
  // Take the first 8 characters of the hex string and convert to a decimal
  const decimal = Number.parseInt(combinedSeed.substring(0, 8), 16)
  // Divide by the maximum possible value to get a number between 0 and 1
  return decimal / 0xffffffff
}

// Verify that a hashed server seed matches the revealed server seed
export function verifyServerSeed(revealedServerSeed: string, hashedServerSeed: string): boolean {
  return hashSeed(revealedServerSeed) === hashedServerSeed
}

// Generate a shuffled deck based on the server seed and client seed
export function generateShuffledDeck(serverSeed: string, clientSeed: string): number[] {
  // Create an array of card indices (0-51)
  const deck = Array.from({ length: 52 }, (_, i) => i)

  // Fisher-Yates shuffle algorithm using the combined seed for randomness
  for (let i = deck.length - 1; i > 0; i--) {
    // Generate a deterministic random number for this shuffle step
    const combinedSeed = combineSeeds(serverSeed, clientSeed, i)
    const randomValue = generateRandomNumber(combinedSeed)

    // Use the random value to pick an index
    const j = Math.floor(randomValue * (i + 1))

    // Swap elements
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }

  return deck
}

