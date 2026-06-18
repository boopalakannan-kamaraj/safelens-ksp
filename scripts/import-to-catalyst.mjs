import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  getCliAccessToken,
  loadCliModules,
} from './lib/cli-auth.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const TABLE_ID = process.env.CATALYST_TABLE_ID ?? '47091000000019465'
const PROJECT_KEY = process.env.CATALYST_PROJECT_KEY ?? '50043101152'
const ENVIRONMENT = process.env.CATALYST_ENVIRONMENT ?? 'Development'
const BATCH_SIZE = 50
const CSV_PATH = join(root, 'incidents.csv')

const CSV_COLUMNS = [
  'incident_id',
  'district',
  'category',
  'severity',
  'status',
  'incident_date',
  'location',
  'description',
  'officer',
  'latitude',
  'longitude',
]

function getApiBaseUrl() {
  const { getActiveDC, ORIGIN } = loadCliModules()
  getActiveDC()
  return ORIGIN.admin
}

function loadProjectContext() {
  const rcPath = join(root, '.catalystrc')
  if (!existsSync(rcPath)) {
    return {
      projectId: process.env.CATALYST_PROJECT_ID ?? '47091000000019001',
      orgId: process.env.CATALYST_ORG_ID ?? '60073566542',
      projectKey: PROJECT_KEY,
    }
  }

  const rc = JSON.parse(readFileSync(rcPath, 'utf8'))
  const projectIdx = rc.actives?.project ?? rc.defaults?.project ?? 1
  const envIdx = rc.actives?.env ?? rc.defaults?.env ?? 1
  const project =
    rc.projects?.find((entry) => entry.idx === projectIdx) ?? rc.projects?.[0]
  const env =
    project?.env?.find((entry) => entry.idx === envIdx) ?? project?.env?.[0]

  return {
    projectId:
      process.env.CATALYST_PROJECT_ID ?? project?.id ?? '47091000000019001',
    orgId: process.env.CATALYST_ORG_ID ?? env?.id ?? '60073566542',
    projectKey:
      process.env.CATALYST_PROJECT_KEY ?? project?.domain?.id ?? PROJECT_KEY,
  }
}

function buildInsertUrl(apiBase, projectId) {
  return `${apiBase}/baas/v1/project/${projectId}/table/${TABLE_ID}/row`
}

async function insertRows(accessToken, rows, context) {
  const url = buildInsertUrl(context.apiBase, context.projectId)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.catalyst.v2+json',
      Environment: ENVIRONMENT,
      'X-Catalyst-Environment': ENVIRONMENT,
      'Catalyst-org': context.orgId,
      PROJECT_ID: context.projectKey,
    },
    body: JSON.stringify(rows),
  })

  const bodyText = await response.text()
  let body
  try {
    body = bodyText ? JSON.parse(bodyText) : null
  } catch {
    body = bodyText
  }

  if (!response.ok) {
    const detail =
      typeof body === 'string'
        ? body
        : body?.message ?? body?.data?.message ?? JSON.stringify(body)
    throw new Error(`HTTP ${response.status}: ${detail}`)
  }

  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body)) return body
  return rows
}

function parseCsv(content) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]
    const next = content[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || (char === '\r' && next === '\n')) {
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') {
        rows.push(row)
      }
      row = []
      if (char === '\r') i += 1
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function loadIncidentsFromCsv() {
  const content = readFileSync(CSV_PATH, 'utf8').trim()
  const parsed = parseCsv(content)

  if (parsed.length < 2) {
    throw new Error(`No data rows found in ${CSV_PATH}`)
  }

  const header = parsed[0]
  if (header.join(',') !== CSV_COLUMNS.join(',')) {
    throw new Error(
      `Unexpected CSV header. Expected: ${CSV_COLUMNS.join(',')}`,
    )
  }

  return parsed.slice(1).map((values, index) => {
    if (values.length !== CSV_COLUMNS.length) {
      throw new Error(
        `Row ${index + 2} has ${values.length} columns, expected ${CSV_COLUMNS.length}`,
      )
    }

    const record = Object.fromEntries(
      CSV_COLUMNS.map((col, colIndex) => [col, values[colIndex]]),
    )

    return {
      incident_id: record.incident_id,
      district: record.district,
      category: record.category,
      severity: record.severity,
      status: record.status,
      incident_date: record.incident_date,
      location: record.location,
      description: record.description,
      officer: record.officer,
      latitude: Number(record.latitude),
      longitude: Number(record.longitude),
    }
  })
}

function chunk(array, size) {
  const batches = []
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size))
  }
  return batches
}

async function main() {
  const { accessToken, activeDC, user } = await getCliAccessToken()
  const projectContext = loadProjectContext()
  const apiBase = getApiBaseUrl()
  const context = { ...projectContext, apiBase }

  console.log('SafeLens → Catalyst Data Store import (REST API)')
  console.log(`Project: ${context.projectId}`)
  console.log(`Table ID: ${TABLE_ID}`)
  console.log(`Environment: ${ENVIRONMENT}`)
  console.log(`API: ${buildInsertUrl(apiBase, context.projectId)}`)
  console.log(`Source: ${CSV_PATH}`)
  if (user?.Email) {
    console.log(`Authenticated via Catalyst CLI (${activeDC}): ${user.Email}`)
  }
  console.log('')

  const incidents = loadIncidentsFromCsv()
  console.log(`Loaded ${incidents.length} records from CSV`)

  let inserted = 0
  let remaining = incidents

  console.log('')
  console.log(`Test insert: 1 row (${incidents[0].incident_id})...`)
  try {
    const testResult = await insertRows(accessToken, [incidents[0]], context)
    console.log(`Test insert successful (${testResult.length} row returned)`)
    inserted = testResult.length
    remaining = incidents.slice(1)
  } catch (err) {
    const message = err?.message ?? String(err)
    if (message.includes('409') && message.includes('Duplicate')) {
      console.log('Test row already exists — continuing with bulk import of all rows')
    } else {
      throw err
    }
  }

  const batches = chunk(remaining, BATCH_SIZE)
  const failures = []

  if (remaining.length > 0) {
    console.log('')
    console.log(
      `Bulk insert: ${remaining.length} row(s) in ${batches.length} batch(es)`,
    )
  }

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i]
    const batchNum = i + 1
    const offset = incidents.length - remaining.length
    const startRow = offset + i * BATCH_SIZE + 1
    const endRow = startRow + batch.length - 1

    process.stdout.write(
      `Batch ${batchNum}/${batches.length}: inserting rows ${startRow}–${endRow}... `,
    )

    try {
      const result = await insertRows(accessToken, batch, context)
      inserted += result.length
      console.log(`done (${result.length} rows)`)
    } catch (err) {
      const message = err?.message ?? String(err)
      console.log('failed')
      failures.push({ batchNum, startRow, endRow, message })
    }
  }

  console.log('')
  console.log('─'.repeat(50))
  if (failures.length === 0) {
    console.log(`SUCCESS: ${inserted}/${incidents.length} incidents inserted.`)
  } else {
    console.log(`PARTIAL: ${inserted}/${incidents.length} incidents inserted.`)
    console.log(`FAILED: ${failures.length} batch(es):`)
    for (const failure of failures) {
      console.log(
        `  • Batch ${failure.batchNum} (rows ${failure.startRow}–${failure.endRow}): ${failure.message}`,
      )
    }
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('')
  console.error('Import failed:', err?.message ?? err)
  console.error('')
  console.error('Ensure you are logged in: catalyst login')
  console.error('Credentials are read from ~/.config/zcatalyst-cli/')
  process.exit(1)
})
