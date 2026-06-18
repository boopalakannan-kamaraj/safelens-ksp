import { askSafeLens } from './api.js'

export async function processSafeLensQuery(query: string): Promise<string> {
  const trimmed = query.trim()
  if (!trimmed) {
    return 'Please enter a query about crime data in Karnataka.'
  }

  const { answer } = await askSafeLens(trimmed)
  return answer
}
