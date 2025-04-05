"use server"

import { cookies } from "next/headers"
import { encrypt, decrypt } from "./encryption"
import type { GameSession } from "./types"
import { v4 as uuidv4 } from "uuid"

// In a production app, you would use a database
// For this example, we'll use a server-side Map
const gameSessions = new Map<string, GameSession>()

export async function getSession(): Promise<GameSession | null> {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get("blackjack_session")

  if (!sessionCookie?.value) {
    return null
  }

  try {
    const [encryptedData, iv] = sessionCookie.value.split(".")
    const sessionId = await decrypt(encryptedData, iv)
    return gameSessions.get(sessionId) || null
  } catch (error) {
    console.error("Failed to decrypt session:", error)
    return null
  }
}

export async function createSession(gameSession: Omit<GameSession, "id">): Promise<string> {
  const sessionId = uuidv4()
  const session: GameSession = {
    id: sessionId,
    ...gameSession,
  }

  gameSessions.set(sessionId, session)

  const { encryptedData, iv } = await encrypt(sessionId)
  const sessionCookie = `${encryptedData}.${iv}`

  cookies().set("blackjack_session", sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 1 day
    path: "/",
    sameSite: "strict",
  })

  return sessionId
}

export async function updateSession(session: GameSession): Promise<void> {
  gameSessions.set(session.id, session)
}

export async function deleteSession(): Promise<void> {
  const session = await getSession()
  if (session) {
    gameSessions.delete(session.id)
  }
  cookies().delete("blackjack_session")
}

