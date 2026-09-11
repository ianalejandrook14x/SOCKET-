import fs from 'fs'
import path from 'path'
import config from '../config.js'

const DB_PATH =
    './database/subbots_config.json'

const DEFAULT_BOT_NAME =
    'jᥲdιbot'

const DEFAULT_OWNER_NAME =
    'tᥱwιᥲᥒιx'

const DEFAULT_MEDIA_URL =
    'https://files.catbox.moe/fhnqaa.jpg'

const DEFAULT_MEDIA_TYPE =
    'image'

const DEFAULT_PREFIX =
    ''

const DEFAULT_EMOJI =
    '🍃'


const databaseDir =
    path.dirname(DB_PATH)


if (!fs.existsSync(databaseDir)) {

    fs.mkdirSync(
        databaseDir,
        {
            recursive: true
        }
    )
}


if (!fs.existsSync(DB_PATH)) {

    fs.writeFileSync(
        DB_PATH,
        JSON.stringify({}, null, 2),
        'utf-8'
    )
}

function decodeIdentifier(target) {

    if (!target) {
        return ''
    }

    const str =
        String(target)

    const id =
        str
            .split('@')[0]
            .split(':')[0]

    return id.replace(
        /[^0-9]/g,
        ''
    )
}

function readDatabase() {

    try {

        if (!fs.existsSync(DB_PATH)) {

            fs.writeFileSync(
                DB_PATH,
                JSON.stringify({}, null, 2),
                'utf-8'
            )
        }

        const content =
            fs.readFileSync(
                DB_PATH,
                'utf-8'
            )

        if (!content.trim()) {
            return {}
        }

        const data =
            JSON.parse(content)

        if (
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data)
        ) {
            return {}
        }

        return data

    } catch (error) {

        console.error(
            '[SUBBOTCONFIG] Error leyendo la base de datos:',
            error
        )

        return {}
    }
}

function writeDatabase(data) {

    try {

        fs.writeFileSync(
            DB_PATH,
            JSON.stringify(
                data,
                null,
                2
            ),
            'utf-8'
        )

        return true

    } catch (error) {

        console.error(
            '[SUBBOTCONFIG] Error guardando la base de datos:',
            error
        )

        return false
    }
}

function createDefaultSubbotConfig(botJid) {

    const cleanNumber =
        decodeIdentifier(botJid)

    if (!cleanNumber) {
        return null
    }

    const data =
        readDatabase()

    if (data[cleanNumber]) {
        return data[cleanNumber]
    }

    const now =
        Date.now()

    const newConfig = {

        name:
            DEFAULT_BOT_NAME,

        ownerName:
            DEFAULT_OWNER_NAME,

        ownerNumber:
            null,

        mediaUrl:
            DEFAULT_MEDIA_URL,

        mediaType:
            DEFAULT_MEDIA_TYPE,

        prefix:
            DEFAULT_PREFIX,

        emoji:
            DEFAULT_EMOJI,

        createdAt:
            now,

        updatedAt:
            now
    }

    data[cleanNumber] =
        newConfig

    writeDatabase(data)

    console.log(
        `[SUBBOTCONFIG] Configuración creada para Jadibot: ${cleanNumber}`
    )

    return newConfig
}


export function getSubbotConfig(botJid) {

    const cleanNumber =
        decodeIdentifier(botJid)

    if (!cleanNumber) {

        return {

            name:
                DEFAULT_BOT_NAME,

            ownerName:
                DEFAULT_OWNER_NAME,

            ownerNumber:
                null,

            mediaUrl:
                DEFAULT_MEDIA_URL,

            mediaType:
                DEFAULT_MEDIA_TYPE,

            prefix:
                DEFAULT_PREFIX,

            emoji:
                DEFAULT_EMOJI
        }
    }

    const data =
        readDatabase()

    if (!data[cleanNumber]) {

        return createDefaultSubbotConfig(
            cleanNumber
        )
    }

    const subData =
        data[cleanNumber]

    const normalizedConfig = {

        name:
            subData.name ||
            DEFAULT_BOT_NAME,

        ownerName:
            subData.ownerName ||
            DEFAULT_OWNER_NAME,

        ownerNumber:
            subData.ownerNumber ||
            null,

        mediaUrl:
            subData.mediaUrl ||
            subData.image ||
            DEFAULT_MEDIA_URL,

        mediaType:
            subData.mediaType ||
            (
                subData.image
                    ? 'image'
                    : DEFAULT_MEDIA_TYPE
            ),

        prefix:
            typeof subData.prefix === 'string'
                ? subData.prefix
                : DEFAULT_PREFIX,

        emoji:
            typeof subData.emoji === 'string' &&
            subData.emoji.trim()
                ? subData.emoji.trim()
                : DEFAULT_EMOJI,

        createdAt:
            subData.createdAt ||
            Date.now(),

        updatedAt:
            subData.updatedAt ||
            Date.now()
    }

    const changed =
        JSON.stringify(subData) !==
        JSON.stringify(normalizedConfig)

    if (changed) {

        data[cleanNumber] =
            normalizedConfig

        writeDatabase(data)
    }

    return normalizedConfig
}

export function saveSubbotConfig(
    botJid,
    newConfig
) {

    const cleanNumber =
        decodeIdentifier(botJid)

    if (!cleanNumber) {
        return false
    }

    const data =
        readDatabase()

    if (!data[cleanNumber]) {

        const now =
            Date.now()

        data[cleanNumber] = {

            name:
                DEFAULT_BOT_NAME,

            ownerName:
                DEFAULT_OWNER_NAME,

            ownerNumber:
                null,

            mediaUrl:
                DEFAULT_MEDIA_URL,

            mediaType:
                DEFAULT_MEDIA_TYPE,

            prefix:
                DEFAULT_PREFIX,

            emoji:
                DEFAULT_EMOJI,

            createdAt:
                now,

            updatedAt:
                now
        }
    }

    data[cleanNumber] = {

        ...data[cleanNumber],

        ...newConfig,

        updatedAt:
            Date.now()
    }

    const saved =
        writeDatabase(data)

    if (saved) {

        console.log(
            `[SUBBOTCONFIG] Configuración actualizada: ${cleanNumber}`
        )
    }

    return saved
}

export function validateSubbotOwner(
    m,
    conn
) {

    const botJid =
        conn?.subBotJid ||
        conn?.user?.jid ||
        conn?.user?.id ||
        ''

    const botLid =
        conn?.user?.lid ||
        ''

    const mainBotSession =
        String(
            config?.sessionName || ''
        )

    const isSubbot =
        Boolean(
            conn?.isSubBot ||
            conn?.isSubbot
        ) ||
        (
            botJid !== '' &&
            !botJid.includes(
                mainBotSession
            )
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
        decodeIdentifier(
            senderJid
        )

    const botNumber =
        decodeIdentifier(
            botJid
        )

    const botLidNumber =
        decodeIdentifier(
            botLid
        )

    const creatorRaw =
        conn?.subbotOwner ||
        ''

    const creatorNumber =
        decodeIdentifier(
            creatorRaw
        )
    
    const subbotConfig =
        getSubbotConfig(
            botNumber
        )

    const configuredOwnerNumber =
        decodeIdentifier(
            subbotConfig?.ownerNumber
        )

    const ownersList =
        Array.isArray(
            config?.owners
        )
            ? config.owners
            : []

    const isMainOwner =
        ownersList.some(
            owner => {

                const ownerNum =
                    decodeIdentifier(
                        Array.isArray(owner)
                            ? owner[0]
                            : owner
                    )

                return (
                    ownerNum !== '' &&
                    ownerNum === senderNumber
                )
            }
        )

    const isConfiguredSubbotOwner =
        (
            configuredOwnerNumber !== '' &&
            configuredOwnerNumber === senderNumber
        )

    const isCreator =
        (
            senderNumber !== '' &&
            senderNumber === creatorNumber
        )

    const isSubbotNumber =
        (
            senderNumber !== '' &&
            senderNumber === botNumber
        ) ||
        (
            senderNumber !== '' &&
            senderNumber === botLidNumber
        )

    const isExactJidOwner =
        (
            senderJid !== '' &&
            (
                senderJid === creatorRaw ||
                senderJid === botJid ||
                senderJid === botLid
            )
        )

    const isSubbotOwner =
        isConfiguredSubbotOwner ||
        isCreator ||
        isSubbotNumber ||
        isExactJidOwner

    if (
        !isMainOwner &&
        !isSubbotOwner
    ) {

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
