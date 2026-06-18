const BASE_URL =
  'https://safelens-60073566542.development.catalystserverless.in/server/safelens_api'

async function request(path) {
  const response = await fetch(`${BASE_URL}${path}`)

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error(`Invalid API response (${response.status})`)
  }

  if (!response.ok || payload.status === 'failure') {
    throw new Error(payload.message || `API request failed (${response.status})`)
  }

  return payload
}

export async function fetchStats() {
  const payload = await request('/incidents/stats')
  return payload.data
}

export async function fetchIncidents(page = 1, limit = 50) {
  const payload = await request(`/incidents?page=${page}&limit=${limit}`)
  return {
    data: payload.data,
    pagination: payload.pagination,
  }
}

export async function fetchByDistrict(district, page = 1, limit = 300) {
  const encoded = encodeURIComponent(district)
  const payload = await request(
    `/incidents/district/${encoded}?page=${page}&limit=${limit}`,
  )
  return {
    data: payload.data,
    district: payload.district,
    pagination: payload.pagination,
  }
}

export async function fetchAll() {
  const payload = await request('/incidents?page=1&limit=313')
  return payload.data
}

export { BASE_URL }
