import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const districts = [
  { id: 'BLR', name: 'Bengaluru Urban', lat: 12.9716, lng: 77.5946, population: 9621551 },
  { id: 'MYS', name: 'Mysuru', lat: 12.2958, lng: 76.6394, population: 1280000 },
  { id: 'HBL', name: 'Hubballi-Dharwad', lat: 15.3647, lng: 75.124, population: 943788 },
  { id: 'BLG', name: 'Belagavi', lat: 15.8497, lng: 74.4977, population: 2036482 },
  { id: 'MNG', name: 'Dakshina Kannada', lat: 12.9141, lng: 74.856, population: 2089649 },
  { id: 'KLG', name: 'Kalaburagi', lat: 17.3297, lng: 76.8343, population: 2566326 },
  { id: 'BLL', name: 'Ballari', lat: 15.1394, lng: 76.9214, population: 1400677 },
  { id: 'SHM', name: 'Shivamogga', lat: 13.9299, lng: 75.5681, population: 1752753 },
  { id: 'DVG', name: 'Davangere', lat: 14.4644, lng: 75.9218, population: 1945497 },
  { id: 'TMK', name: 'Tumakuru', lat: 13.3379, lng: 77.1173, population: 2678980 },
  { id: 'HSN', name: 'Hassan', lat: 13.0068, lng: 76.0996, population: 1776421 },
  { id: 'RCR', name: 'Raichur', lat: 16.2076, lng: 77.3563, population: 1928812 },
  { id: 'BDR', name: 'Bidar', lat: 17.9104, lng: 77.5199, population: 1703300 },
  { id: 'KLR', name: 'Kolar', lat: 13.136, lng: 78.1298, population: 1536401 },
  { id: 'CTD', name: 'Chitradurga', lat: 14.2254, lng: 76.398, population: 1660378 },
  { id: 'VJP', name: 'Vijayapura', lat: 16.8302, lng: 75.71, population: 2177331 },
  { id: 'UDP', name: 'Udupi', lat: 13.3409, lng: 74.7421, population: 1177361 },
  { id: 'KDG', name: 'Kodagu', lat: 12.4244, lng: 75.7382, population: 554519 },
  { id: 'CKM', name: 'Chikkamagaluru', lat: 13.3161, lng: 75.772, population: 1139619 },
  { id: 'MDY', name: 'Mandya', lat: 12.5218, lng: 76.8951, population: 1805769 },
  { id: 'RMN', name: 'Ramanagara', lat: 12.7209, lng: 77.2814, population: 1082739 },
  { id: 'YDG', name: 'Yadgir', lat: 16.7734, lng: 77.1376, population: 1174271 },
  { id: 'KPL', name: 'Koppal', lat: 15.3549, lng: 76.1548, population: 1389920 },
  { id: 'BGK', name: 'Bagalkot', lat: 16.1691, lng: 75.6615, population: 1889334 },
  { id: 'GDG', name: 'Gadag', lat: 15.4316, lng: 75.6269, population: 1064690 },
  { id: 'HVR', name: 'Haveri', lat: 14.7936, lng: 75.4044, population: 1597668 },
  { id: 'UKN', name: 'Uttara Kannada', lat: 14.7937, lng: 74.6869, population: 1437169 },
  { id: 'VJN', name: 'Vijayanagara', lat: 15.335, lng: 76.46, population: 1353293 },
  { id: 'CMR', name: 'Chamarajanagar', lat: 11.9261, lng: 76.9437, population: 1020750 },
  { id: 'CHM', name: 'Chikkaballapur', lat: 13.4355, lng: 77.7315, population: 1254377 },
  { id: 'BLR-R', name: 'Bengaluru Rural', lat: 13.2257, lng: 77.575, population: 990923 },
]

const areaByDistrict = {
  BLR: ['MG Road', 'Whitefield', 'Koramangala', 'Indiranagar', 'Jayanagar', 'Electronic City', 'Yelahanka', 'Hebbal', 'BTM Layout', 'Marathahalli'],
  MYS: ['Vijayanagar', 'Gokulam', 'Nazarbad', 'Bannimantap', 'Saraswathipuram', 'Kuvempunagar'],
  HBL: ['Station Road', 'Gokul Road', 'Vidyanagar', 'Deshpande Nagar', 'Unkal'],
  BLG: ['Camp Area', 'Tilakwadi', 'Angol', 'Shahapur'],
  MNG: ['Hampankatta', 'Kadri', 'Surathkal', 'Bendoor', 'Port Area'],
  KLG: ['Sedam Road', 'Super Market', 'Jewargi Cross', 'Malkhed Road'],
  BLL: ['Cantonment', 'Parvati Nagar', 'Toranagallu Road', 'Cowl Bazaar'],
  SHM: ['Gopala', 'Vinoba Nagar', 'Durgigudi', 'Bhadravathi Road'],
  DVG: ['PJ Extension', 'MCC B Block', 'Azad Nagar', 'Chigateri'],
  TMK: ['B.H. Road', 'Siddaganga Mutt', 'Gubbi Cross', 'Kyathsandra'],
  HSN: ['BM Road', 'Arsikere Road', 'Campus Area', 'Ramanathapura'],
  RCR: ['Mantralayam Road', 'Station Area', 'Sindhanur Road', 'Lingasugur Cross'],
  BDR: ['Manna Ekhelli', 'Halbarga', 'Gumpa Area', 'Chidri Road'],
  KLR: ['Robertsonpet', 'BEML Layout', 'Tamaka', 'Andersonpet'],
  CTD: ['NH Bypass', 'Devigiri', 'Hosadurga Road', 'Medehalli'],
  VJP: ['Gol Gumbaz Area', 'Station Road', 'Indi Road', 'Almel'],
  UDP: ['Car Street', 'Manipal Road', 'Kundapura Road', 'Malpe'],
  KDG: ['Madikeri Town', 'Kushalnagar', 'Virajpet Road', 'Somwarpet'],
  CKM: ['MG Road', 'Kaimara', 'Koppa Road', 'Narasimharajapura'],
  MDY: ['Mandya Town', 'Srirangapatna', 'Maddur', 'Pandavapura'],
  RMN: ['Kanakapura Road', 'Channapatna', 'Magadi Road', 'Bidadi'],
  YDG: ['Shahpur', 'Gurmitkal Road', 'Station Area', 'Saidapur'],
  KPL: ['Gangavathi Road', 'Kukanoor Cross', 'Yelburga Road', 'Karatagi'],
  BGK: ['Navanagar', 'Vidyagiri', 'Jamkhandi Road', 'Badami Cross'],
  GDG: ['Mulgund Road', 'Station Area', 'Betageri', 'Mundaragi Road'],
  HVR: ['Haveri Town', 'Ranebennur Cross', 'Byadgi Road', 'Hangal Road'],
  UKN: ['Karwar Port', 'Ankola Road', 'Sirsi Road', 'Kumta Beach Road'],
  VJN: ['Hospete', 'Kamalapura', 'Kottur Cross', 'Kudligi Road'],
  CMR: ['Gunhouse Road', 'Yelandur Cross', 'Kollegal Road', 'Hanur'],
  CHM: ['Chikkaballapur Town', 'Gauribidanur Road', 'Bagepalli Cross', 'Sidlaghatta'],
  'BLR-R': ['Nelamangala', 'Doddaballapur', 'Devanahalli', 'Hoskote'],
}

const categories = [
  { name: 'Theft', count: 90 },
  { name: 'Murder', count: 6 },
  { name: 'Kidnapping', count: 6 },
  { name: 'Assault', count: 29 },
  { name: 'Burglary', count: 29 },
  { name: 'Cybercrime', count: 29 },
  { name: 'Fraud', count: 28 },
  { name: 'Robbery', count: 28 },
  { name: 'Domestic Violence', count: 28 },
  { name: 'Drug Offense', count: 27 },
]

const descriptions = {
  Theft: [
    'Two-wheeler stolen from residential parking area during night hours',
    'Mobile phone snatching near bus stand by motorcycle-borne offenders',
    'Copper wire theft from construction site reported by site supervisor',
    'Gold chain snatching near market area during peak shopping hours',
    'Laptop theft from unattended vehicle at parking lot',
    'Bicycle stolen from apartment compound entrance',
    'Cash theft from shop counter while owner was distracted',
    'Agricultural pump motor theft from farm shed overnight',
  ],
  Assault: [
    'Physical assault following road rage incident at traffic junction',
    'Group assault during local festival near temple premises',
    'Assault with blunt object during property dispute altercation',
    'Bar fight escalated into serious assault injuring two persons',
    'Assault on auto driver over fare disagreement',
  ],
  Burglary: [
    'Residential burglary — jewellery and cash stolen from locked house',
    'Commercial burglary at electronics shop after closing hours',
    'House break-in while family was away on vacation',
    'Office burglary — computer equipment and documents stolen',
    'Attempted burglary foiled by alarm system at warehouse',
  ],
  Cybercrime: [
    'UPI fraud — victim lost money via fake payment request link',
    'Phishing attack compromised corporate email credentials',
    'Ransomware attack on SME server with data encryption',
    'OTP fraud targeting elderly citizen through impersonation call',
    'Online shopping fraud — paid for goods never delivered',
  ],
  Robbery: [
    'Armed robbery at jewellery store during business hours',
    'Highway robbery of cash-carrying courier van',
    'ATM customer robbed at knifepoint after withdrawal',
    'Snatch-and-run robbery of business cash collection',
  ],
  Fraud: [
    'Investment scam promising high returns to local traders',
    'Real estate fraud using forged property documents',
    'Job recruitment scam collecting fees via social media',
    'Loan fraud using forged identity documents',
    'Matrimonial fraud extracting money from victim family',
  ],
  'Domestic Violence': [
    'Domestic violence complaint filed by spouse at police station',
    'Protection order sought following repeated harassment at home',
    'Domestic assault during family dispute — victim hospitalized',
    'Dowry-related harassment complaint registered by victim',
  ],
  'Drug Offense': [
    'NDPS seizure — contraband recovered during vehicle checkpoint',
    'Drug peddling near college campus — two suspects detained',
    'Cross-border drug trafficking interdiction at highway check post',
    'Synthetic drug distribution network bust in urban area',
  ],
  Murder: [
    'Homicide reported following altercation at residential premises',
    'Murder case registered — body found in isolated area',
    'Contract killing suspected in business rivalry case',
  ],
  Kidnapping: [
    'Kidnapping for ransom — victim abducted from workplace',
    'Minor kidnapping case — child recovered within 48 hours',
    'Attempted kidnapping foiled by bystanders near school',
  ],
}

const severityByCategory = {
  Theft: ['Low', 'Medium', 'Medium', 'Low'],
  Assault: ['Medium', 'High', 'High', 'Critical'],
  Burglary: ['Medium', 'High', 'Medium', 'High'],
  Cybercrime: ['Medium', 'High', 'Critical', 'High'],
  Robbery: ['High', 'Critical', 'High', 'Critical'],
  Fraud: ['Medium', 'High', 'Medium', 'High'],
  'Domestic Violence': ['Medium', 'High', 'High', 'Medium'],
  'Drug Offense': ['High', 'Critical', 'High', 'Critical'],
  Murder: ['Critical', 'Critical', 'Critical'],
  Kidnapping: ['Critical', 'Critical', 'High'],
}

const statuses = ['Open', 'Closed', 'Under Investigation']
const officers = [
  'PSI Rajesh Kumar', 'ASI Priya Shetty', 'PI Mohan Gowda', 'PSI Anitha Reddy',
  'PI Suresh Naik', 'ASI Kavitha B.N.', 'PSI Ramesh H.R.', 'PI Deepak Joshi',
  'ASI Meena Kumari', 'PSI Vijay Patil', 'PI Ganesh Murthy', 'ASI Lakshmi Devi',
  'PSI Arun Kulkarni', 'PI Shweta Rao', 'ASI Manjunath S.', 'PSI Divya Hegde',
  'PI Prakash Babu', 'ASI Sunitha M.', 'PSI Harish B.', 'PI Nandini Gowda',
]

const suspectNames = [
  'Ravi K.', 'Unknown Network', 'Gang Alpha-3', 'Port Syndicate', 'Cyber Cell X',
  'Border Network', 'Shankar M.', 'Devraj P.', 'Kiran N.', 'Farooq S.',
  'Manjunath R.', 'Prakash T.', 'Anil D.', 'Ramesh V.', 'Sunil H.',
  'Vikram B.', 'Naveen C.', 'Arun J.', 'Deepak L.', 'Sanjay G.',
]

const suspectMO = {
  'Ravi K.': 'Mobile snatching near transit hubs; operates solo during evening rush hours',
  'Unknown Network': 'Coordinated UPI phishing via spoofed payment apps targeting seniors',
  'Gang Alpha-3': 'Armed robbery of commercial establishments by 3–4 member team',
  'Port Syndicate': 'Maritime drug trafficking via fishing vessels and coastal routes',
  'Cyber Cell X': 'Ransomware deployment against SMEs via unpatched VPN endpoints',
  'Border Network': 'Cross-border NDPS smuggling via interstate highways',
}

const victimNames = Array.from({ length: 40 }, (_, i) => `Victim ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`.trim())

let seed = 42
function rand() {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)]
}

function buildDistrictPool() {
  const pool = []
  const otherDistricts = districts.filter((d) => !['BLR', 'MYS', 'HBL'].includes(d.id))
  for (let i = 0; i < 75; i++) pool.push('BLR')
  for (let i = 0; i < 24; i++) pool.push('MYS')
  for (let i = 0; i < 24; i++) pool.push('HBL')
  const perOther = Math.floor(177 / otherDistricts.length)
  let remainder = 177 - perOther * otherDistricts.length
  for (const d of otherDistricts) {
    for (let i = 0; i < perOther; i++) pool.push(d.id)
    if (remainder > 0) {
      pool.push(d.id)
      remainder--
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

function buildCategoryPool() {
  const pool = []
  for (const cat of categories) {
    for (let i = 0; i < cat.count; i++) pool.push(cat.name)
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

function randomDate() {
  const start = new Date(2025, 0, 1)
  const end = new Date(2026, 5, 8)
  const ts = start.getTime() + rand() * (end.getTime() - start.getTime())
  const d = new Date(ts)
  return d.toISOString().slice(0, 10)
}

function jitterCoord(lat, lng) {
  return {
    lat: +(lat + (rand() - 0.5) * 0.12).toFixed(4),
    lng: +(lng + (rand() - 0.5) * 0.12).toFixed(4),
  }
}

const districtPool = buildDistrictPool()
const categoryPool = buildCategoryPool()

const incidents = []
const suspectUsage = new Map()
const victimUsage = new Map()

for (let i = 0; i < 300; i++) {
  const districtId = districtPool[i]
  const district = districts.find((d) => d.id === districtId)
  const category = categoryPool[i]
  const areas = areaByDistrict[districtId] || ['Town Area']
  const location = pick(areas)
  const coords = jitterCoord(district.lat, district.lng)
  const severity = pick(severityByCategory[category])
  const status = pick(statuses)
  const officer = pick(officers)
  const descList = descriptions[category]
  const description = pick(descList).replace('market area', `${location} market`).replace('residential', `${location} residential`)

  let suspectId, victimId
  if (rand() < 0.55 && category !== 'Murder' && category !== 'Kidnapping') {
    const sIdx = Math.floor(rand() * suspectNames.length)
    suspectId = `SUS-${String(sIdx + 1).padStart(3, '0')}`
    suspectUsage.set(suspectId, (suspectUsage.get(suspectId) || 0) + 1)
  }
  if (rand() < 0.65) {
    const vIdx = Math.floor(rand() * victimNames.length)
    victimId = `VIC-${String(vIdx + 1).padStart(3, '0')}`
    victimUsage.set(victimId, (victimUsage.get(victimId) || 0) + 1)
  }

  incidents.push({
    id: `INC-${String(i + 1).padStart(3, '0')}`,
    districtId,
    districtName: district.name,
    category,
    severity,
    date: randomDate(),
    lat: coords.lat,
    lng: coords.lng,
    location,
    description,
    status,
    officer,
    ...(suspectId ? { suspectId } : {}),
    ...(victimId ? { victimId } : {}),
  })
}

incidents.sort((a, b) => a.date.localeCompare(b.date))

// Boost June 2026 with realistic volume (12–15 additional incidents)
const june2026Incidents = [
  { districtId: 'BLR', category: 'Theft', severity: 'Medium', date: '2026-06-01', location: 'Koramangala', description: 'Two-wheeler theft from apartment basement parking in Koramangala' },
  { districtId: 'BLR', category: 'Cybercrime', severity: 'High', date: '2026-06-02', location: 'Indiranagar', description: 'OTP fraud call targeting IT professional — ₹85,000 lost in Indiranagar' },
  { districtId: 'MYS', category: 'Burglary', severity: 'High', date: '2026-06-02', location: 'Gokulam', description: 'Residential burglary in Gokulam — jewellery and cash stolen while family away' },
  { districtId: 'HBL', category: 'Robbery', severity: 'Critical', date: '2026-06-03', location: 'Station Road', description: 'Armed robbery at mobile store on Station Road during evening hours' },
  { districtId: 'BLG', category: 'Fraud', severity: 'Medium', date: '2026-06-03', location: 'Camp Area', description: 'Fake loan approval scam defrauding small business owner in Camp Area' },
  { districtId: 'MNG', category: 'Drug Offense', severity: 'High', date: '2026-06-04', location: 'Port Area', description: 'NDPS seizure near port area — 1.8kg contraband recovered from vehicle' },
  { districtId: 'TMK', category: 'Assault', severity: 'Medium', date: '2026-06-04', location: 'B.H. Road', description: 'Assault during land dispute altercation on B.H. Road' },
  { districtId: 'KLR', category: 'Theft', severity: 'Low', date: '2026-06-05', location: 'Robertsonpet', description: 'Gold chain snatching near Robertsonpet bus stand during morning rush' },
  { districtId: 'DVG', category: 'Burglary', severity: 'Medium', date: '2026-06-06', location: 'PJ Extension', description: 'Commercial burglary at hardware shop in PJ Extension after closing' },
  { districtId: 'SHM', category: 'Domestic Violence', severity: 'High', date: '2026-06-06', location: 'Gopala', description: 'Domestic violence complaint filed in Gopala — victim admitted to district hospital' },
  { districtId: 'RCR', category: 'Theft', severity: 'Medium', date: '2026-06-07', location: 'Station Area', description: 'Copper cable theft from railway yard near Station Area' },
  { districtId: 'UDP', category: 'Cybercrime', severity: 'Medium', date: '2026-06-07', location: 'Malpe', description: 'Online payment fraud targeting tourists at Malpe beach vendors' },
  { districtId: 'BLR', category: 'Fraud', severity: 'High', date: '2026-06-08', location: 'Whitefield', description: 'Real estate advance fraud using forged documents in Whitefield' },
]

let nextId = incidents.length + 1
for (const spec of june2026Incidents) {
  const district = districts.find((d) => d.id === spec.districtId)
  const coords = jitterCoord(district.lat, district.lng)
  const category = spec.category
  let suspectId, victimId
  if (category !== 'Murder' && category !== 'Kidnapping') {
    suspectId = `SUS-${String(Math.floor(rand() * suspectNames.length) + 1).padStart(3, '0')}`
    suspectUsage.set(suspectId, (suspectUsage.get(suspectId) || 0) + 1)
  }
  victimId = `VIC-${String(Math.floor(rand() * victimNames.length) + 1).padStart(3, '0')}`
  victimUsage.set(victimId, (victimUsage.get(victimId) || 0) + 1)

  incidents.push({
    id: `INC-${String(nextId++).padStart(3, '0')}`,
    districtId: spec.districtId,
    districtName: district.name,
    category: spec.category,
    severity: spec.severity,
    date: spec.date,
    lat: coords.lat,
    lng: coords.lng,
    location: spec.location,
    description: spec.description,
    status: pick(statuses),
    officer: pick(officers),
    ...(suspectId ? { suspectId } : {}),
    ...(victimId ? { victimId } : {}),
  })
}

incidents.sort((a, b) => a.date.localeCompare(b.date))
// Re-number IDs chronologically after June boost
incidents.forEach((inc, idx) => {
  inc.id = `INC-${String(idx + 1).padStart(3, '0')}`
})

const juneCount = incidents.filter((i) => i.date.startsWith('2026-06')).length
console.log(`June 2026 incidents: ${juneCount}`)

// Network nodes
const topSuspects = [...suspectUsage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
const topVictims = [...victimUsage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
const districtCounts = {}
for (const inc of incidents) {
  districtCounts[inc.districtId] = (districtCounts[inc.districtId] || 0) + 1
}
const topDistricts = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)

const networkNodes = []
const networkEdges = []
const edgeSet = new Set()

for (const [sid] of topSuspects) {
  const idx = parseInt(sid.split('-')[1]) - 1
  const label = suspectNames[idx] || `Suspect ${sid}`
  networkNodes.push({
    id: sid,
    label,
    type: 'suspect',
    riskScore: 70 + Math.floor(rand() * 26),
    mo: suspectMO[label] || `Active in ${pick(['theft', 'fraud', 'assault'])} cases across multiple jurisdictions`,
  })
}

for (const [vid] of topVictims) {
  const idx = parseInt(vid.split('-')[1]) - 1
  networkNodes.push({
    id: vid,
    label: victimNames[idx] || vid,
    type: 'victim',
    mo: 'Linked to multiple incident reports in the network database',
  })
}

for (const [did] of topDistricts) {
  const d = districts.find((x) => x.id === did)
  networkNodes.push({
    id: `LOC-${did}`,
    label: d.name,
    type: 'location',
    mo: `Crime hotspot district with ${districtCounts[did]} recorded incidents in dataset`,
  })
}

for (const inc of incidents) {
  if (!inc.suspectId || !inc.victimId) continue
  const sNode = networkNodes.find((n) => n.id === inc.suspectId)
  const vNode = networkNodes.find((n) => n.id === inc.victimId)
  if (!sNode || !vNode) continue
  const key = `${inc.suspectId}-${inc.victimId}-${inc.category}`
  if (!edgeSet.has(key)) {
    edgeSet.add(key)
    networkEdges.push({ source: inc.suspectId, target: inc.victimId, label: inc.category, weight: 2 + Math.floor(rand() * 3) })
  }
  const locId = `LOC-${inc.districtId}`
  if (networkNodes.find((n) => n.id === locId)) {
    const lk = `${inc.suspectId}-${locId}`
    if (!edgeSet.has(lk)) {
      edgeSet.add(lk)
      networkEdges.push({ source: inc.suspectId, target: locId, label: 'Operates in', weight: 4 })
    }
  }
}

const output = {
  districts,
  incidents,
  networkNodes,
  networkEdges,
}

const outPath = join(__dirname, '../src/data/mockCrimeData.json')
writeFileSync(outPath, JSON.stringify(output, null, 2))
console.log(`Generated ${incidents.length} incidents, ${networkNodes.length} network nodes, ${networkEdges.length} edges`)
console.log(`District BLR: ${incidents.filter((i) => i.districtId === 'BLR').length}`)
console.log(`District MYS: ${incidents.filter((i) => i.districtId === 'MYS').length}`)
console.log(`District HBL: ${incidents.filter((i) => i.districtId === 'HBL').length}`)
console.log(`Theft: ${incidents.filter((i) => i.category === 'Theft').length}`)
