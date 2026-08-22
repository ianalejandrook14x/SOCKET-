import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT = path.join(__dirname, '..')
const DATABASE_PATH = path.join(ROOT, 'database')

const FILES = {
    usuarios: path.join(DATABASE_PATH, 'usuarios.json'),
    grupos: path.join(DATABASE_PATH, 'grupos.json'),
    subbots: path.join(DATABASE_PATH, 'subbots.json')
}

// Variables en Memoria (RAM) para evitar desincronización
let dbUsers = null
let dbGroups = null
let dbSubbots = null

function ensureDatabase() {
    if (!fs.existsSync(DATABASE_PATH)) {
        fs.mkdirSync(DATABASE_PATH, { recursive: true })
    }

    const subbotsFolder = path.join(DATABASE_PATH, 'subbots')
    if (!fs.existsSync(subbotsFolder)) {
        fs.mkdirSync(subbotsFolder, { recursive: true })
    }

    if (!fs.existsSync(FILES.usuarios)) saveJSON(FILES.usuarios, {})
    if (!fs.existsSync(FILES.grupos)) saveJSON(FILES.grupos, {})
    if (!fs.existsSync(FILES.subbots)) saveJSON(FILES.subbots, {})
}

function loadJSON(file) {
    try {
        if (!fs.existsSync(file)) return {}
        const data = fs.readFileSync(file, 'utf8')
        return JSON.parse(data || '{}')
    } catch (error) {
        console.error(`Error leyendo ${file}:`, error)
        return {}
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
        return true
    } catch (error) {
        console.error(`Error guardando ${file}:`, error)
        return false
    }
}

// ==================== SECCIÓN USUARIOS ====================

function getUsers() {
    ensureDatabase()
    if (!dbUsers) dbUsers = loadJSON(FILES.usuarios)
    return dbUsers
}

function saveUsers(data) {
    ensureDatabase()
    dbUsers = data
    return saveJSON(FILES.usuarios, dbUsers)
}

function getUser(jid) {
    const users = getUsers()
    if (!users[jid]) {
        users[jid] = {
            id: jid,
            exp: 0,
            level: 1,
            coins: 0,
            bank: 0,
            premium: false,
            premiumTime: 0,
            registered: true,
            createdAt: Date.now(),
            lastDaily: 0,
            lastWork: 0
        }
        saveUsers(users)
    }
    return users[jid]
}

function updateUser(jid, data = {}) {
    const users = getUsers()
    const user = getUser(jid)
    users[jid] = { ...user, ...data }
    saveUsers(users)
    return users[jid]
}

// ==================== SECCIÓN GRUPOS ====================

function getGroups() {
    ensureDatabase()
    if (!dbGroups) dbGroups = loadJSON(FILES.grupos)
    return dbGroups
}

function saveGroups(data) {
    ensureDatabase()
    dbGroups = data
    return saveJSON(FILES.grupos, dbGroups)
}

function getGroup(jid) {
    const groups = getGroups()
    if (!groups[jid]) {
        groups[jid] = {
            id: jid,
            welcome: true,
            antilink: false,
            nsfw: false,
            antinsfw: false,
            animaciones: true, // 👈 Se añade el estado por defecto para animaciones
            economy: true,
            createdAt: Date.now()
        }
        saveGroups(groups)
    } else {
        // Asigna valores por defecto si el grupo ya existía previamente en el JSON
        let needsSave = false

        if (groups[jid].antinsfw === undefined) {
            groups[jid].antinsfw = false
            needsSave = true
        }
        if (groups[jid].animaciones === undefined) {
            groups[jid].animaciones = true
            needsSave = true
        }

        if (needsSave) saveGroups(groups)
    }
    return groups[jid]
}

function updateGroup(jid, data = {}) {
    const groups = getGroups()
    const group = getGroup(jid)
    groups[jid] = { ...group, ...data }
    saveGroups(groups)
    return groups[jid]
}

// ==================== SECCIÓN SUBBOTS ====================

function getSubBots() {
    ensureDatabase()
    if (!dbSubbots) dbSubbots = loadJSON(FILES.subbots)
    return dbSubbots
}

function saveSubBots(data) {
    ensureDatabase()
    dbSubbots = data
    return saveJSON(FILES.subbots, dbSubbots)
}

ensureDatabase()

export {
    FILES,
    ensureDatabase,
    loadJSON,
    saveJSON,
    getUsers,
    saveUsers,
    getUser,
    updateUser,
    getGroups,
    saveGroups,
    getGroup,
    updateGroup,
    getSubBots,
    saveSubBots
}
