"use server"

import { randomBytes, createCipheriv, createDecipheriv } from "crypto"

// Encryption key (in a real app, this would be an environment variable)
const ENCRYPTION_KEY = randomBytes(32)
const ALGORITHM = "aes-256-cbc"

export async function encrypt(text: string): Promise<{ encryptedData: string; iv: string }> {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
  }
}

export async function decrypt(encryptedData: string, ivHex: string): Promise<string> {
  const iv = Buffer.from(ivHex, "hex")
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  let decrypted = decipher.update(encryptedData, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

