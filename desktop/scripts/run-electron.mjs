// Lance electron-vite en utilisant un binaire Electron qui FONCTIONNE, même si le
// téléchargement npm a échoué (réseau/proxy/antivirus). Ordre de résolution :
//   1) ELECTRON_EXEC_PATH (si déjà défini)
//   2) le binaire d'Electron Fiddle (cache local, multi-plateforme)
//   3) le binaire de node_modules/electron (si présent et fonctionnel)
// Sinon : on laisse electron-vite tenter, et on affiche un message d'aide.
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { spawnSync, spawn } from 'child_process'

const cmd = process.argv[2] || 'dev'

function fiddleBinary() {
  const home = homedir()
  if (process.platform === 'darwin') {
    return join(home, 'Library/Application Support/Electron Fiddle/electron-bin/current/Electron.app/Contents/MacOS/Electron')
  }
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || join(home, 'AppData/Roaming'), 'Electron Fiddle/electron-bin/current/electron.exe')
  }
  return join(home, '.config/Electron Fiddle/electron-bin/current/electron')
}

function nodeModulesBinary() {
  try {
    const dir = join(process.cwd(), 'node_modules', 'electron')
    const pathFile = join(dir, 'path.txt')
    if (!existsSync(pathFile)) return null
    return join(dir, 'dist', readFileSync(pathFile, 'utf8').trim())
  } catch { return null }
}

function works(bin) {
  if (!bin || !existsSync(bin)) return false
  try {
    const r = spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 15000 })
    return r.status === 0 && /^v?\d+\./.test((r.stdout || '').trim())
  } catch { return false }
}

let exec = process.env.ELECTRON_EXEC_PATH
if (!works(exec)) exec = [fiddleBinary(), nodeModulesBinary()].find(works)

const env = { ...process.env }
if (exec) {
  env.ELECTRON_EXEC_PATH = exec
  console.log(`▶ Electron : ${exec}`)
} else {
  console.warn('⚠ Aucun binaire Electron fonctionnel trouvé.')
  console.warn('  → Installe Electron Fiddle (il fournit un binaire), ou réinstalle : npm install electron --force')
  console.warn('  → Ou définis ELECTRON_EXEC_PATH vers un binaire Electron.')
}

const bin = join('node_modules', '.bin', process.platform === 'win32' ? 'electron-vite.cmd' : 'electron-vite')
const child = spawn(bin, [cmd], { stdio: 'inherit', env, shell: process.platform === 'win32' })
child.on('exit', code => process.exit(code ?? 0))
