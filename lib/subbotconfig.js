import fs from 'fs'
import path from 'path'
import config from '../config.js'

const DB_PATH = './database/subbots_config.json'

const DEFAULT_BOT_NAME =
    'jᥲdιbot'

const DEFAULT_OWNER_NAME =
    'tᥱwιᥲᥒιx'

const DEFAULT_MEDIA_URL =
    'https://files.catbox.moe/fhnqaa.jpg'

const DEFAULT_MEDIA_TYPE =
    'image'

if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true })
}

if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
        DB_PATH,
        JSON.stringify({}, null, 2)
    )
}

function decodeIdentifier(target) {
    if (!target) return ''

    const str = String(target)
    const id = str
        .split('@')[0]
        .split(':')[0]

    return id.replace(/[^0-9]/g, '')
}

export function getSubbotConfig(botJid, defaultConfig) {
    const cleanNumber = decodeIdentifier(botJid)

    try {
        const data = JSON.parse(
            fs.readFileSync(DB_PATH, 'utf-8')
        )

        if (cleanNumber && data[cleanNumber]) {

            const subData = data[cleanNumber]

            return {
                name:
                    subData.name ||
                    defaultConfig?.botName ||
                    config?.botName ||
                    DEFAULT_BOT_NAME,

                ownerName:
                    subData.ownerName ||
                    defaultConfig?.ownerName ||
                    DEFAULT_OWNER_NAME,

                ownerNumber:
                    subData.ownerNumber ||
                    defaultConfig?.ownerNumber ||
                    config?.ownerNumber ||
                    null,

                mediaUrl:
                    subData.mediaUrl ||
                    subData.image ||
                    DEFAULT_MEDIA_URL,

                mediaType:
                    subData.mediaType ||
                    (subData.image
                        ? 'image'
                        : DEFAULT_MEDIA_TYPE)
            }
        }

        return {
            name:
                defaultConfig?.botName ||
                config?.botName ||
                DEFAULT_BOT_NAME,

            ownerName:
                defaultConfig?.ownerName ||
                DEFAULT_OWNER_NAME,

            ownerNumber:
                defaultConfig?.ownerNumber ||
                config?.ownerNumber ||
                null,

            mediaUrl: DEFAULT_MEDIA_URL,

            mediaType: DEFAULT_MEDIA_TYPE
        }

    } catch {
        return {
            name:
                defaultConfig?.botName ||
                config?.botName ||
                DEFAULT_BOT_NAME,

            ownerName:
                defaultConfig?.ownerName ||
                DEFAULT_OWNER_NAME,

            ownerNumber:
                defaultConfig?.ownerNumber ||
                config?.ownerNumber ||
                null,

            mediaUrl: DEFAULT_MEDIA_URL,

            mediaType: DEFAULT_MEDIA_TYPE
        }
    }
}

export function saveSubbotConfig(botJid, newConfig) {
    const cleanNumber = decodeIdentifier(botJid)

    if (!cleanNumber) return

    const data = JSON.parse(
        fs.readFileSync(DB_PATH, 'utf-8')
    )

    data[cleanNumber] = {
        ...(data[cleanNumber] || {}),
        ...newConfig,
        updatedAt: Date.now()
    }

    fs.writeFileSync(
        DB_PATH,
        JSON.stringify(data, null, 2)
    )
}

export function validateSubbotOwner(m, conn) {

    const botJid =
        conn?.user?.jid ||
        conn?.user?.id ||
        ''

    const botLid =
        conn?.user?.lid ||
        ''

    const mainBotSession =
        String(config?.sessionName || '')

    const isSubbot =
        Boolean(
            conn?.isSubBot ||
            conn?.isSubbot
        ) ||
        (
            botJid !== '' &&
            !botJid.includes(mainBotSession)
        )

    if (!isSubbot) {
        return {
            allowed: false,
            reason:
                '*Este comando solo se puede utilizar en la sesion Jadibot.*'
        }
    }

    const senderJid =
        m?.sender ||
        m?.key?.participant ||
        m?.key?.remoteJid ||
        ''

    const senderNumber =
        decodeIdentifier(senderJid)

    const botNumber =
        decodeIdentifier(botJid)

    const botLidNumber =
        decodeIdentifier(botLid)

    const creatorRaw =
        conn?.subbotOwner ||
        ''

    const creatorNumber =
        decodeIdentifier(creatorRaw)

    const ownersList =
        Array.isArray(config?.owners)
            ? config.owners
            : []

    const isMainOwner =
        ownersList.some(owner => {

            const ownerNum =
                decodeIdentifier(owner)

            return (
                ownerNum !== '' &&
                (
                    ownerNum === senderNumber ||
                    owner === senderJid
                )
            )
        })

    const isSubbotOwner =
        (
            senderNumber !== '' &&
            senderNumber === creatorNumber
        ) ||
        (
            senderNumber !== '' &&
            senderNumber === botNumber
        ) ||
        (
            senderNumber !== '' &&
            senderNumber === botLidNumber
        ) ||
        (
            senderJid !== '' &&
            (
                senderJid === creatorRaw ||
                senderJid === botJid ||
                senderJid === botLid
            )
        )

    if (!isMainOwner && !isSubbotOwner) {
        return {
            allowed: false,
            reason:
                '> *Solo el creador y el Jadibot pueden acceder a este apartado.*'
        }
    }

    return {
        allowed: true
    }
}
