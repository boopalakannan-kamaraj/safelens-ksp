export const BASE_URL: string

export function fetchStats(): Promise<{
  total: number
  byCategory: Record<string, number>
  byDistrict: Record<string, number>
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
}>

export function fetchIncidents(
  page?: number,
  limit?: number,
): Promise<{
  data: unknown[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}>

export function fetchByDistrict(
  district: string,
  page?: number,
  limit?: number,
): Promise<{
  data: unknown[]
  district: string
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}>

export function fetchAll(): Promise<unknown[]>

export function askSafeLens(question: string): Promise<{
  answer: string
  sources: unknown[]
}>
