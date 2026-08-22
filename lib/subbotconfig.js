import fs from 'fs'
import path from 'path'
import config from '../config.js'

const DB_PATH = './database/subbots_config.json'

if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true })
}
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2))
}

function decodeIdentifier(target) {
    if (!target) return ''
    const str = String(target)
    const id = str.split('@')[0].split(':')[0]
    return id.replace(/[^0-9]/g, '')
}

export function getSubbotConfig(botJid, defaultConfig) {
    const cleanNumber = decodeIdentifier(botJid)

    try {
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
        
        if (cleanNumber && data[cleanNumber]) {
            const subData = data[cleanNumber]
            return {
                name: subData.name || defaultConfig?.botName || config?.botName || 'Cuervo',
                ownerName: subData.ownerName || defaultConfig?.ownerName || 'TheDevil',
                ownerNumber: subData.ownerNumber || defaultConfig?.ownerNumber || config?.ownerNumber || null,
                mediaUrl: subData.mediaUrl || subData.image || null,
                mediaType: subData.mediaType || (subData.image ? 'image' : null)
            }
        }

        return {
            name: defaultConfig?.botName || config?.botName || 'Cuervo',
            ownerName: defaultConfig?.ownerName || 'TheDevil',
            ownerNumber: defaultConfig?.ownerNumber || config?.ownerNumber || null,
            mediaUrl: null,
            mediaType: null
        }
    } catch {
        return {
            name: defaultConfig?.botName || config?.botName || 'Cuervo',
            ownerName: defaultConfig?.ownerName || 'TheDevil',
            ownerNumber: defaultConfig?.ownerNumber || config?.ownerNumber || null,
            mediaUrl: null,
            mediaType: null
        }
    }
}

export function saveSubbotConfig(botJid, newConfig) {
    const cleanNumber = decodeIdentifier(botJid)
    if (!cleanNumber) return

    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))

    data[cleanNumber] = {
        ...(data[cleanNumber] || {}),
        ...newConfig,
        updatedAt: Date.now()
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

export function validateSubbotOwner(m, conn) {

    const botJid = conn?.user?.jid || conn?.user?.id || ''
    const botLid = conn?.user?.lid || ''
    const mainBotSession = String(config?.sessionName || '')

    const isSubbot = Boolean(conn?.isSubBot || conn?.isSubbot) || (botJid !== '' && !botJid.includes(mainBotSession))

    if (!isSubbot) {
        return {
            allowed: false,
            reason: '*Este comando solo se puede utilizar en la sección Jadibot.*'
        }
    }

    const senderJid = m?.sender || m?.key?.participant || m?.key?.remoteJid || ''
    const senderNumber = decodeIdentifier(senderJid)

    const botNumber = decodeIdentifier(botJid)
    const botLidNumber = decodeIdentifier(botLid)

    const creatorRaw = conn?.subbotOwner || ''
    const creatorNumber = decodeIdentifier(creatorRaw)

    const ownersList = Array.isArray(config?.owners) ? config.owners : []
    const isMainOwner = ownersList.some(owner => {
        const ownerNum = decodeIdentifier(owner)
        return ownerNum !== '' && (ownerNum === senderNumber || owner === senderJid)
    })

    const isSubbotOwner = 
        (senderNumber !== '' && senderNumber === creatorNumber) ||
        (senderNumber !== '' && senderNumber === botNumber) ||
        (senderNumber !== '' && senderNumber === botLidNumber) ||
        (senderJid !== '' && (senderJid === creatorRaw || senderJid === botJid || senderJid === botLid))

    if (!isMainOwner && !isSubbotOwner) {
        return {
            allowed: false,
            reason: '> *Solo el dueño del bot y el Jadibot pueden editar estas configuraciones.*'
        }
    }

    return { allowed: true }
}
