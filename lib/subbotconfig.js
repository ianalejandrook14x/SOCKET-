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
    'https://files.catbox.moe/rdn7sk.jpg'

const DEFAULT_MEDIA_TYPE =
    'image'

const DEFAULT_PREFIX =
    ''

const DEFAULT_EMOJI =
    '🍃'

const DEFAULT_SELF =
    'off'

function ensureDatabase() {

    const databaseDir =
        path.dirname(
            DB_PATH
        )

    if (
        !fs.existsSync(
            databaseDir
        )
    ) {

        fs.mkdirSync(
            databaseDir,
            {
                recursive: true
            }
        )
    }

    if (
        !fs.existsSync(
            DB_PATH
        )
    ) {

        fs.writeFileSync(
            DB_PATH,
            '{}',
            'utf8'
        )
    }
}

export function decodeIdentifier(
    target
) {

    if (!target) {
        return ''
    }

    return String(target)
        .split('@')[0]
        .split(':')[0]
        .replace(
            /[^0-9]/g,
            ''
        )
}

function readDatabase() {

    try {

        ensureDatabase()

        const raw =
            fs.readFileSync(
                DB_PATH,
                'utf8'
            )

        if (!raw.trim()) {
            return {}
        }

        const data =
            JSON.parse(
                raw
            )

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
            '[SUBBOT CONFIG] Error leyendo base de datos:',
            error
        )

        return {}
    }
}

function writeDatabase(
    data
) {

    try {

        ensureDatabase()

        fs.writeFileSync(
            DB_PATH,
            JSON.stringify(
                data,
                null,
                2
            ),
            'utf8'
        )

        return true

    } catch (error) {

        console.error(
            '[SUBBOT CONFIG] Error escribiendo base de datos:',
            error
        )

        return false
    }
}

function createDefaultSubbotConfig(
    botJid
) {

    const botNumber =
        decodeIdentifier(
            botJid
        )

    const now =
        new Date().toISOString()

    return {

        name:
            DEFAULT_BOT_NAME,

        ownerName:
            DEFAULT_OWNER_NAME,

        ownerNumber:
            botNumber || '',

        mediaUrl:
            DEFAULT_MEDIA_URL,

        mediaType:
            DEFAULT_MEDIA_TYPE,

        prefix:
            DEFAULT_PREFIX,

        emoji:
            DEFAULT_EMOJI,
        
        self:
            DEFAULT_SELF,

        createdAt:
            now,

        updatedAt:
            now
    }
}

function normalizeSelf(
    value
) {

    const self =
        String(
            value || DEFAULT_SELF
        )
            .trim()
            .toLowerCase()

    if (
        self === 'on'
    ) {

        return 'on'
    }

    return 'off'
}

export function getSubbotConfig(
    botJid
) {

    const botNumber =
        decodeIdentifier(
            botJid
        )

    if (!botNumber) {

        return {

            name:
                DEFAULT_BOT_NAME,

            ownerName:
                DEFAULT_OWNER_NAME,

            ownerNumber:
                '',

            mediaUrl:
                DEFAULT_MEDIA_URL,

            mediaType:
                DEFAULT_MEDIA_TYPE,

            prefix:
                DEFAULT_PREFIX,

            emoji:
                DEFAULT_EMOJI,

            self:
                DEFAULT_SELF
        }
    }


    const database =
        readDatabase()

    if (
        !database[botNumber]
    ) {

        database[botNumber] =
            createDefaultSubbotConfig(
                botJid
            )

        writeDatabase(
            database
        )

        return {
            ...database[botNumber]
        }
    }


    const current =
        database[botNumber]

    const normalized = {

        ...current,

        name:
            typeof current.name === 'string' &&
            current.name.trim()
                ? current.name
                : DEFAULT_BOT_NAME,

        ownerName:
            typeof current.ownerName === 'string' &&
            current.ownerName.trim()
                ? current.ownerName
                : DEFAULT_OWNER_NAME,

        ownerNumber:
            current.ownerNumber
                ? String(
                    current.ownerNumber
                )
                : botNumber,

        mediaUrl:
            typeof current.mediaUrl === 'string' &&
            current.mediaUrl.trim()
                ? current.mediaUrl
                : DEFAULT_MEDIA_URL,

        mediaType:
            typeof current.mediaType === 'string' &&
            current.mediaType.trim()
                ? current.mediaType
                : DEFAULT_MEDIA_TYPE,

        prefix:
            typeof current.prefix === 'string'
                ? current.prefix
                : DEFAULT_PREFIX,

        emoji:
            typeof current.emoji === 'string' &&
            current.emoji.trim()
                ? current.emoji
                : DEFAULT_EMOJI,

        self:
            normalizeSelf(
                current.self
            ),

        createdAt:
            current.createdAt ||
            new Date().toISOString(),

        updatedAt:
            current.updatedAt ||
            new Date().toISOString()
    }

    database[botNumber] =
        normalized

    writeDatabase(
        database
    )


    return {
        ...normalized
    }
}

export function saveSubbotConfig(
    botJid,
    newConfig = {}
) {

    const botNumber =
        decodeIdentifier(
            botJid
        )

    if (!botNumber) {

        return false
    }


    const database =
        readDatabase()

    if (
        !database[botNumber]
    ) {

        database[botNumber] =
            createDefaultSubbotConfig(
                botJid
            )
    }


    const current =
        database[botNumber]

    const updated = {

        ...current,

        ...newConfig,

        self:
            normalizeSelf(
                newConfig.self ??
                current.self ??
                DEFAULT_SELF
            ),

        updatedAt:
            new Date().toISOString()
    }

    updated.name =
        typeof updated.name === 'string' &&
        updated.name.trim()
            ? updated.name
            : DEFAULT_BOT_NAME

    updated.ownerName =
        typeof updated.ownerName === 'string' &&
        updated.ownerName.trim()
            ? updated.ownerName
            : DEFAULT_OWNER_NAME

    updated.ownerNumber =
        updated.ownerNumber
            ? String(
                updated.ownerNumber
            )
            : botNumber

    updated.mediaUrl =
        typeof updated.mediaUrl === 'string' &&
        updated.mediaUrl.trim()
            ? updated.mediaUrl
            : DEFAULT_MEDIA_URL

    updated.mediaType =
        typeof updated.mediaType === 'string' &&
        updated.mediaType.trim()
            ? updated.mediaType
            : DEFAULT_MEDIA_TYPE

    updated.prefix =
        typeof updated.prefix === 'string'
            ? updated.prefix
            : DEFAULT_PREFIX

    updated.emoji =
        typeof updated.emoji === 'string' &&
        updated.emoji.trim()
            ? updated.emoji
            : DEFAULT_EMOJI

    updated.createdAt =
        current.createdAt ||
        new Date().toISOString()


    database[botNumber] =
        updated


    return writeDatabase(
        database
    )
}

export function validateSubbotOwner(
    m,
    conn
) {

    try {
        
        const botJid =
            conn?.subBotJid ||
            conn?.user?.jid ||
            conn?.user?.id ||
            ''

        const botNumber =
            decodeIdentifier(
                botJid
            )

        const senderJid =
            m?.sender ||
            m?.key?.participant ||
            m?.key?.remoteJid ||
            ''

        const senderNumber =
            decodeIdentifier(
                senderJid
            )


        if (
            !senderNumber
        ) {

            return {
                allowed: false,
                reason: 'No se pudo identificar al usuario.'
            }
        }


        const subbotConfig =
            getSubbotConfig(
                botJid
            )

        const owners =
            Array.isArray(
                config?.owners
            )
                ? config.owners
                : []


        const isMainOwner =
            owners.some(
                owner => {

                    const ownerNumber =
                        decodeIdentifier(
                            Array.isArray(owner)
                                ? owner[0]
                                : owner
                        )

                    return (
                        ownerNumber !== '' &&
                        ownerNumber ===
                        senderNumber
                    )
                }
            )


        if (
            isMainOwner
        ) {

            return {
                allowed: true,
                reason: 'Owner principal.'
            }
        }

        const configuredOwner =
            decodeIdentifier(
                subbotConfig?.ownerNumber
            )


        if (
            configuredOwner !== '' &&
            configuredOwner === senderNumber
        ) {

            return {
                allowed: true,
                reason: 'Dueño del Jadibot.'
            }
        }

        const creatorNumber =
            decodeIdentifier(
                conn?.subbotOwner
            )


        if (
            creatorNumber !== '' &&
            creatorNumber === senderNumber
        ) {

            return {
                allowed: true,
                reason: 'Creador de la sesión Jadibot.'
            }
        }

        if (
            botNumber !== '' &&
            botNumber === senderNumber
        ) {

            return {
                allowed: true,
                reason: 'Número del Jadibot.'
            }
        }


        return {
            allowed: false,
            reason:
                'Usuario común.'
        }

    } catch (error) {

        console.error(
            '[SUBBOT CONFIG] Error validando owner:',
            error
        )

        return {
            allowed: false,
            reason:
                'Error validando permisos.'
        }
    }
}

export default {

    getSubbotConfig,

    saveSubbotConfig,

    validateSubbotOwner,

    decodeIdentifier
}
