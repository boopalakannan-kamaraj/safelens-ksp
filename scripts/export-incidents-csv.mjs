import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const COLUMNS = [
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

function escapeCsv(value) {
  const str = String(value ?? '')
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toISOString().slice(0, 10)
}

const data = JSON.parse(
  readFileSync(join(root, 'src/data/mockCrimeData.json'), 'utf8'),
)

const rows = data.incidents.map((inc) => [
  inc.id,
  inc.districtName,
  inc.category,
  inc.severity,
  inc.status,
  formatDate(inc.date),
  inc.location,
  inc.description,
  inc.officer,
  inc.lat,
  inc.lng,
])

const csv = [
  COLUMNS.join(','),
  ...rows.map((row) => row.map(escapeCsv).join(',')),
].join('\n')

const outPath = join(root, 'incidents.csv')
writeFileSync(outPath, csv, 'utf8')

console.log(`Exported ${rows.length} incidents to ${outPath}`)
