import { execSync } from 'child_process'
import { createRequire } from 'module'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function findCliRoot() {
  const candidates = [
    join(__dirname, '..', 'node_modules', 'zcatalyst-cli'),
    join(__dirname, '..', 'node_modules', 'zcatalyst-cli', 'package.json'),
  ]

  try {
    const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
    candidates.push(join(npmRoot, 'zcatalyst-cli'))
  } catch {
    // global npm root unavailable
  }

  candidates.push('/opt/homebrew/lib/node_modules/zcatalyst-cli')

  for (const candidate of candidates) {
    const root = candidate.endsWith('package.json')
      ? dirname(candidate)
      : candidate
    if (existsSync(join(root, 'package.json'))) {
      return root
    }
  }

  return null
}

let cachedModules

export function loadCliModules() {
  if (cachedModules) return cachedModules

  const root = findCliRoot()
  if (!root) {
    throw new Error(
      'zcatalyst-cli not found. Install it with: npm install -g zcatalyst-cli',
    )
  }

  const req = createRequire(join(root, 'package.json'))
  cachedModules = {
    ConfigStore: req('./lib/util_modules/config-store.js').default,
    Credential: req('./lib/authentication/credential.js').default,
    getActiveDC: req('./lib/util_modules/dc.js').getActiveDC,
    ORIGIN: req('./lib/util_modules/constants/lib/urls.js').default,
  }

  return cachedModules
}

export function configureSdkFromCli() {
  const { getActiveDC, ORIGIN } = loadCliModules()
  getActiveDC()
  process.env.X_ZOHO_CATALYST_ACCOUNTS_URL ??= ORIGIN.auth
  process.env.X_ZOHO_CATALYST_CONSOLE_URL ??= ORIGIN.admin
}

export async function getCliAccessToken() {
  const { ConfigStore, Credential, getActiveDC } = loadCliModules()
  const activeDC = getActiveDC()
  const encryptedToken = ConfigStore.get(`${activeDC}.credential`)

  if (!encryptedToken) {
    throw new Error(
      `No Catalyst CLI credentials for datacenter "${activeDC}". Run: catalyst login`,
    )
  }

  const user = ConfigStore.get(`${activeDC}.user`, null)
  Credential.init(encryptedToken)
  const accessToken = await Credential.getAccessToken()

  return { accessToken, activeDC, user }
}
