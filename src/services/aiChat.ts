import { askSafeLens } from './api.js'

export interface AskSafeLensSource {
  index: number
  content: string | null
  documentId?: string | null
  documentTitle?: string | null
}

export interface AskSafeLensResult {
  answer: string
  sources: AskSafeLensSource[]
}

/** POST `{ question }` to `/ask` and return `{ answer, sources }`. */
export async function askSafeLensQuestion(
  question: string,
): Promise<AskSafeLensResult> {
  const trimmed = question.trim()
  if (!trimmed) {
    throw new Error('Question is required')
  }

  const { answer, sources } = await askSafeLens(trimmed)
  return { answer, sources: sources as AskSafeLensSource[] }
}
