import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const MESSAGE_STORAGE = join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".config",
  "opencode",
  "sessions"
)

export interface ToolPart {
  type: string
  callID?: string
  tool?: string
  state?: {
    input?: unknown
    output?: string
    status?: string
  }
}

export interface MessagePart {
  type: string
  parts?: ToolPart[]
}

export interface TurnProtectionConfig {
  enabled: boolean
  turns: number
}

export function getMessageDir(sessionID: string): string | null {
  if (!existsSync(MESSAGE_STORAGE)) return null

  const directPath = join(MESSAGE_STORAGE, sessionID)
  if (existsSync(directPath)) return directPath

  for (const dir of readdirSync(MESSAGE_STORAGE)) {
    const sessionPath = join(MESSAGE_STORAGE, dir, sessionID)
    if (existsSync(sessionPath)) return sessionPath
  }

  return null
}

export function readMessages(sessionID: string): MessagePart[] {
  const messageDir = getMessageDir(sessionID)
  if (!messageDir) return []

  const messages: MessagePart[] = []
  
  try {
    const files = readdirSync(messageDir).filter(f => f.endsWith(".json"))
    for (const file of files) {
      const content = readFileSync(join(messageDir, file), "utf-8")
      const data = JSON.parse(content)
      if (data.parts) {
        messages.push(data)
      }
    }
  } catch {
    return []
  }

  return messages
}

export function countTurns(messages: MessagePart[]): number {
  let turns = 0
  for (const msg of messages) {
    if (!msg.parts) continue
    for (const part of msg.parts) {
      if (part.type === "step-start") {
        turns++
      }
    }
  }
  return turns
}

export function isToolProtectedByTurn(
  toolTurn: number,
  currentTurn: number,
  turnProtection?: TurnProtectionConfig
): boolean {
  if (!turnProtection?.enabled) return false
  
  const protectedThreshold = currentTurn - turnProtection.turns + 1
  return toolTurn >= protectedThreshold
}
