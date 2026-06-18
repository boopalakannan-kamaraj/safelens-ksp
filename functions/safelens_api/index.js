'use strict'

const catalyst = require('zcatalyst-sdk-node')

const TABLE_ID = '47091000000019465'
const MAX_LIMIT = 300
const DEFAULT_LIMIT = 50

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    ],
  })
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS)
    res.end()
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
