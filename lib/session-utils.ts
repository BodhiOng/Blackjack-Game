"use server"

import { cookies } from "next/headers"
import type { GameSession } from "./types"
import { v4 as uuidv4 } from "uuid"

// In a production app, you would use a database
// For this example, we'll use a global variable to store sessions
// This is not ideal for production but works for our educational demo
const gameSessions: Record<string, GameSession> = {}

// Simple obfuscation instead of encryption (for educational purposes)
function obfuscate(text: string): string {
  return Buffer.from(text).toString("base64")
}

function deobfuscate(text: string): string {
  return Buffer.from(text, "base64").toString("utf8")
}

export async function getSession(): Promise<GameSession | null> {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get("blackjack_session")

  if (!sessionCookie?.value) {
    console.log("No session cookie found")
    return null
  }

  try {
    const sessionId = deobfuscate(sessionCookie.value)
    const session = gameSessions[sessionId]

    if (!session) {
      console.log(`Session ${sessionId} not found in gameSessions`)
      return null
    }

    return session
  } catch (error) {
    console.error("Failed to decode session:", error)
    return null
  }
}

export async function createSession(gameSession: Omit<GameSession, "id">): Promise<string> {
  const sessionId = gameSession.id || uuidv4()
  const session: GameSession = {
    id: sessionId,
    ...gameSession,
  }

  // Store in our global sessions object
  gameSessions[sessionId] = session
  console.log(`Created session ${sessionId}`)

  const obfuscatedId = obfuscate(sessionId)

  // Set the cookie
  cookies().set("blackjack_session", obfuscatedId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 1 day
    path: "/",
    sameSite: "lax", // Changed from 'strict' to 'lax' for better compatibility
  })

  return sessionId
}

export async function updateSession(session: GameSession): Promise<void> {
  gameSessions[session.id] = session
  console.log(`Updated session ${session.id}`)
}

export async function deleteSession(): Promise<void> {
  const session = await getSession()
  if (session) {
    delete gameSessions[session.id]
    console.log(`Deleted session ${session.id}`)
  }
  cookies().delete("blackjack_session")
}

