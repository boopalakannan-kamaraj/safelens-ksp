'use strict'

const catalyst = require('zcatalyst-sdk-node')

const TABLE_ID = '47091000000019465'
const MAX_LIMIT = 300
const DEFAULT_LIMIT = 50

const RAG_CONSOLE_ORIGIN = 'https://console.catalyst.zoho.in'
const RAG_PROJECT_ID = '47091000000019001'
const CATALYST_ORG_ID = '60073566542'
const KB_DOCUMENT_ID = '2385000000004002'
const RAG_FETCH_TIMEOUT_MS = 30000
const RAG_MAX_ATTEMPTS = 3
const RAG_RETRY_DELAY_MS = 1500
const RAG_URL =
  `${RAG_CONSOLE_ORIGIN}/quickml/v1/project/${RAG_PROJECT_ID}/rag/answer`

const SYSTEM_PROMPT_PREFIX =
  'You are SafeLens AI, a crime intelligence assistant for Karnataka State Police. ' +
  'Only report incidents that genuinely and specifically match the user\'s criteria. ' +
  'If retrieved context includes unrelated incidents, ignore them. ' +
  'If you\'re not confident the retrieved information precisely answers the question, say so rather than guessing. ' +
  'Question: '

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
  })
  res.end(JSON.stringify(data))
}

function getRequestPath(req) {
  const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`)
  let pathname = parsedUrl.pathname
  pathname = pathname.replace(/^\/server\/[^/]+/, '') || '/'
  if (!pathname.startsWith('/')) pathname = `/${pathname}`
  return { pathname, query: Object.fromEntries(parsedUrl.searchParams) }
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT),
  )
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

function getTable(adminApp) {
  return adminApp.datastore().table(TABLE_ID)
}

async function fetchAllRows(table) {
  const rows = []
  let nextToken

  do {
    const page = await table.getPagedRows({ nextToken, maxRows: 300 })
    rows.push(...(page.data || []))
    nextToken = page.more_records ? page.next_token : undefined
  } while (nextToken)

  return rows
}

function countByField(rows, field) {
  const counts = {}
  for (const row of rows) {
    const value = row[field]
    if (value == null || value === '') continue
    counts[value] = (counts[value] || 0) + 1
  }
  return counts
}

function topDistricts(rows, limit = 10) {
  const counts = countByField(rows, 'district')
  return Object.fromEntries(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit),
  )
}

async function getStats(table) {
  const rows = await fetchAllRows(table)

  return {
    total: rows.length,
    byCategory: countByField(rows, 'category'),
    byDistrict: topDistricts(rows, 10),
    bySeverity: countByField(rows, 'severity'),
    byStatus: countByField(rows, 'status'),
  }
}

function paginateRows(rows, pagination) {
  const { page, limit, offset } = pagination
  const total = rows.length
  const data = rows.slice(offset, offset + limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}

async function queryRows(table, filterFn, pagination) {
  const allRows = await fetchAllRows(table)
  const filtered = filterFn ? allRows.filter(filterFn) : allRows
  return paginateRows(filtered, pagination)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function truncateForLog(text, max = 100) {
  if (typeof text !== 'string') return ''
  return text.length <= max ? text : `${text.slice(0, max)}...`
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** OAuth token for RAG — Catalyst admin scope (same Zoho-oauthtoken header as Stage 1 direct curl). */
async function getRagAccessToken(adminApp) {
  adminApp.credential.switchUser('admin')
  const token = await adminApp.credential.getToken()
  if (!token?.access_token) {
    throw new Error('Failed to obtain OAuth access token')
  }
  return token.access_token
}

function buildRagQuery(question) {
  return SYSTEM_PROMPT_PREFIX + question
}

function bodyContainsRag1004(rawBody) {
  return typeof rawBody === 'string' && rawBody.includes('RAG_1004')
}

function mapSources(retrievedNodes) {
  if (!Array.isArray(retrievedNodes)) return []

  return retrievedNodes.map((node, index) => {
    if (typeof node === 'string') {
      return { index, content: node }
    }

    if (node && typeof node === 'object') {
      return {
        index,
        content: node.content ?? null,
        documentId: node.document_id ?? null,
        documentTitle: node.document_title ?? null,
      }
    }

    return { index, content: String(node) }
  })
}

function parseRagAnswer(raw) {
  const answer = typeof raw?.response === 'string' ? raw.response : null
  const sources = mapSources(raw?.retrieved_nodes)
  return { answer, sources }
}

/** Single RAG HTTP attempt — mirrors Stage 1 direct fetch (Zoho-oauthtoken + CATALYST-ORG). */
async function fetchRagAttempt(accessToken, query, attemptNum) {
  console.log(
    `RAG call attempt ${attemptNum}/${RAG_MAX_ATTEMPTS} starting, query preview:`,
    truncateForLog(query),
  )

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), RAG_FETCH_TIMEOUT_MS)

  let httpResponse
  let rawBody = ''

  try {
    httpResponse = await fetch(RAG_URL, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'CATALYST-ORG': CATALYST_ORG_ID,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        documents: [KB_DOCUMENT_ID],
      }),
      signal: controller.signal,
    })
    rawBody = await httpResponse.text()
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(
        `RAG request timed out after ${RAG_FETCH_TIMEOUT_MS}ms`,
      )
      timeoutError.statusCode = 504
      throw timeoutError
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  let parsed = null
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null
  } catch {
    const parseError = new Error('RAG returned non-JSON response')
    parseError.statusCode = httpResponse.status
    parseError.rawBody = rawBody
    throw parseError
  }

  if (!httpResponse.ok) {
    const apiError = new Error(
      parsed?.message || `RAG request failed with HTTP ${httpResponse.status}`,
    )
    apiError.statusCode = httpResponse.status
    apiError.rawBody = rawBody
    throw apiError
  }

  console.log(
    'RAG raw response:',
    JSON.stringify({
      status: parsed?.status ?? null,
      responseLength:
        typeof parsed?.response === 'string' ? parsed.response.length : 0,
      retrievedNodesCount: Array.isArray(parsed?.retrieved_nodes)
        ? parsed.retrieved_nodes.length
        : 0,
      responsePreview:
        typeof parsed?.response === 'string'
          ? truncateForLog(parsed.response, 200)
          : null,
    }),
  )

  return parsed
}

async function callRagWithRetries(adminApp, question) {
  const accessToken = await getRagAccessToken(adminApp)
  const query = buildRagQuery(question)
  let lastError = null

  for (let attempt = 1; attempt <= RAG_MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchRagAttempt(accessToken, query, attempt)
    } catch (error) {
      lastError = error
      console.error(
        `RAG failure on attempt ${attempt}/${RAG_MAX_ATTEMPTS}:`,
        error?.message || String(error),
      )
      if (error?.statusCode != null) {
        console.error('RAG error HTTP status:', error.statusCode)
      }
      if (error?.rawBody) {
        console.error('RAG error rawBody:', error.rawBody)
      }

      const shouldRetry =
        attempt < RAG_MAX_ATTEMPTS && bodyContainsRag1004(error?.rawBody)

      if (!shouldRetry) {
        throw error
      }

      console.log(
        `RAG retry attempt ${attempt + 1}/${RAG_MAX_ATTEMPTS} after RAG_1004 error for question:`,
        truncateForLog(question),
      )
      await sleep(RAG_RETRY_DELAY_MS)
    }
  }

  throw lastError
}

async function handleAsk(req, res) {
  let body
  try {
    body = await readJsonBody(req)
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' })
    return
  }

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) {
    sendJson(res, 400, { error: 'Question is required' })
    return
  }

  console.log('/ask question:', truncateForLog(question))

  const adminApp = catalyst.initialize(req, { scope: 'admin' })

  try {
    const raw = await callRagWithRetries(adminApp, question)
    const { answer, sources } = parseRagAnswer(raw)

    if (!answer) {
      console.error('RAG ask error: missing response field in RAG payload')
      console.error('RAG ask error rawBody:', JSON.stringify(raw))
      sendJson(res, 502, { error: 'AI assistant is temporarily unavailable' })
      return
    }

    sendJson(res, 200, { answer, sources })
  } catch (error) {
    console.error('RAG ask error (final):', error?.message || String(error))
    if (error?.statusCode != null) {
      console.error('RAG ask error statusCode:', error.statusCode)
    }
    if (error?.rawBody) {
      console.error('RAG ask error rawBody:', error.rawBody)
    }
    sendJson(res, 502, { error: 'AI assistant is temporarily unavailable' })
  }
}

async function routeRequest(req, res) {
  const { pathname, query } = getRequestPath(req)
  const adminApp = catalyst.initialize(req, { scope: 'admin' })
  const table = getTable(adminApp)

  if (pathname === '/incidents/stats') {
    const stats = await getStats(table)
    sendJson(res, 200, { status: 'success', data: stats })
    return
  }

  const districtMatch = pathname.match(/^\/incidents\/district\/(.+)$/)
  if (districtMatch) {
    const district = decodeURIComponent(districtMatch[1])
    const pagination = parsePagination(query)
    const result = await queryRows(
      table,
      (row) => row.district === district,
      pagination,
    )
    sendJson(res, 200, { status: 'success', district, ...result })
    return
  }

  if (pathname === '/incidents') {
    const pagination = parsePagination(query)
    const result = await queryRows(table, null, pagination)
    sendJson(res, 200, { status: 'success', ...result })
    return
  }

  sendJson(res, 404, {
    status: 'failure',
    message: 'Not found',
    routes: [
      'GET /incidents?page=&limit=',
      'GET /incidents/district/:district?page=&limit=',
      'GET /incidents/stats',
      'POST /ask',
    ],
  })
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS)
    res.end()
    return
  }

  const { pathname } = getRequestPath(req)

  if (pathname === '/ask' && req.method === 'POST') {
    try {
      await handleAsk(req, res)
    } catch (error) {
      console.error('safelens_api /ask error:', error)
      sendJson(res, 500, { error: 'AI assistant is temporarily unavailable' })
    }
    return
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { status: 'failure', message: 'Method not allowed' })
    return
  }

  try {
    await routeRequest(req, res)
  } catch (error) {
    console.error('safelens_api error:', error)
    sendJson(res, 500, {
      status: 'failure',
      message: error.message || 'Internal server error',
    })
  }
}
