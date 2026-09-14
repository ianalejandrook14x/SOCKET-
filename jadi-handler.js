import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import config from './config.js'
import { getSubbotConfig } from './lib/subbotconfig.js'

const __filename =
    fileURLToPath(import.meta.url)

const __dirname =
    path.dirname(__filename)

const pluginsPath =
    path.join(
        __dirname,
        'jadiplugins'
    )

global.jadiPlugins =
    global.jadiPlugins || {}

function getAllFiles(directory) {

    let files = []

    if (!fs.existsSync(directory)) {
        return files
    }

    const items =
        fs.readdirSync(directory)

    for (const item of items) {

        const fullPath =
            path.join(
                directory,
                item
            )

        const stat =
            fs.statSync(fullPath)

        if (stat.isDirectory()) {

            files.push(
                ...getAllFiles(fullPath)
            )

        } else {

            files.push(fullPath)
        }
    }

    return files
}

export async function loadSubbotPlugins() {

    try {

        if (!fs.existsSync(pluginsPath)) {

            fs.mkdirSync(
                pluginsPath,
                {
                    recursive: true
                }
            )
        }

        const files =
            getAllFiles(
                pluginsPath
            )

        let loaded = 0

        for (const file of files) {

            if (!file.endsWith('.js')) {
                continue
            }

            try {

                const fileUrl =
                    pathToFileURL(file).href

                const imported =
                    await import(
                        `${fileUrl}?subbot=${Date.now()}`
                    )

                const plugin =
                    imported.default ||
                    imported

                if (!plugin) {
                    continue
                }

                const pluginName =
                    path.relative(
                        pluginsPath,
                        file
                    )

                global.jadiPlugins[
                    pluginName
                ] = plugin

                loaded++

            } catch {

                continue
            }
        }

        return loaded

    } catch {

        return 0
    }
}

function getMessageText(m) {

    const message =
        m.message

    if (!message) {
        return ''
    }

    if (message.conversation) {

        return message.conversation
    }

    if (message.extendedTextMessage) {

        return (
            message.extendedTextMessage.text ||
            ''
        )
    }

    if (message.imageMessage) {

        return (
            message.imageMessage.caption ||
            ''
        )
    }

    if (message.videoMessage) {

        return (
            message.videoMessage.caption ||
            ''
        )
    }

    if (message.buttonsResponseMessage) {

        return (
            message.buttonsResponseMessage
                .selectedButtonId ||
            ''
        )
    }

    if (message.listResponseMessage) {

        return (
            message.listResponseMessage
                .singleSelectReply
                ?.selectedRowId ||
            ''
        )
    }

    if (
        message.templateButtonReplyMessage
    ) {

        return (
            message.templateButtonReplyMessage
                .selectedId ||
            ''
        )
    }

    if (
        message.interactiveResponseMessage
    ) {

        try {

            const params =
                JSON.parse(
                    message
                        .interactiveResponseMessage
                        ?.nativeFlowResponseMessage
                        ?.paramsJson ||
                    '{}'
                )

            return (
                params.id ||
                params.selectedId ||
                ''
            )

        } catch {

            return ''
        }
    }

    return ''
}

function getQuotedMessage(m) {

    const contextInfo =
        m.message
            ?.extendedTextMessage
            ?.contextInfo

    if (!contextInfo?.quotedMessage) {
        return null
    }

    return {

        key: {

            remoteJid:
                m.chat,

            fromMe:
                contextInfo.participant ===
                m.key?.participant,

            id:
                contextInfo.stanzaId,

            participant:
                contextInfo.participant
        },

        message:
            contextInfo.quotedMessage
    }
}

function normalizeMessage(
    conn,
    message
) {

    const m =
        message

    m.id =
        m.key?.id

    m.chat =
        m.key?.remoteJid

    m.sender =
        m.key?.participant ||
        m.key?.remoteJid

    m.fromMe =
        Boolean(
            m.key?.fromMe
        )

    m.text =
        getMessageText(m)

    m.quoted =
        getQuotedMessage(m)

    m.isGroup =
        Boolean(
            m.chat?.endsWith('@g.us')
        )

    m.isSubBot =
        true

    m.isMainBot =
        false

    m.reply = async (
        text,
        options = {}
    ) => {

        return conn.sendMessage(
            m.chat,
            {
                text: String(text),
                ...options
            },
            {
                quoted: m
            }
        )
    }

    m.send = async (
        content,
        options = {}
    ) => {

        return conn.sendMessage(
            m.chat,
            content,
            {
                quoted: m,
                ...options
            }
        )
    }

    m.react = async (
        emoji
    ) => {

        return conn.sendMessage(
            m.chat,
            {
                react: {
                    text: emoji,
                    key: m.key
                }
            }
        )
    }

    return m
}

function getCurrentSubbotConfig(conn) {

    const botJid =
        conn?.subBotJid ||
        conn?.user?.jid ||
        conn?.user?.id ||
        ''

    if (!botJid) {

        return {
            prefix: '',
            emoji: '🍃',
            self: 'off'
        }
    }

    return getSubbotConfig(
        botJid
    )
}

function decodeIdentifier(target) {

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

function isMainOwner(senderNumber) {

    if (!senderNumber) {
        return false
    }

    const owners =
        Array.isArray(config?.owners)
            ? config.owners
            : []

    return owners.some(
        owner => {

            const ownerNumber =
                decodeIdentifier(
                    Array.isArray(owner)
                        ? owner[0]
                        : owner
                )

            return (
                ownerNumber !== '' &&
                ownerNumber === senderNumber
            )
        }
    )
}

function canUseSelfMode(
    m,
    conn,
    botConfig
) {

    const senderJid =
        m?.sender ||
        m?.key?.participant ||
        m?.key?.remoteJid ||
        ''

    const senderNumber =
        decodeIdentifier(
            senderJid
        )

    if (!senderNumber) {
        return false
    }

    if (
        isMainOwner(
            senderNumber
        )
    ) {

        return true
    }

    const configuredOwner =
        decodeIdentifier(
            botConfig?.ownerNumber
        )

    if (
        configuredOwner !== '' &&
        configuredOwner === senderNumber
    ) {

        return true
    }

    const creatorNumber =
        decodeIdentifier(
            conn?.subbotOwner
        )

    if (
        creatorNumber !== '' &&
        creatorNumber === senderNumber
    ) {

        return true
    }

    return false
}

function parseCommand(
    text,
    prefix
) {

    const cleanText =
        String(text || '').trim()

    if (!prefix) {

        if (!cleanText) {
            return null
        }

        return {
            usedPrefix: '',
            commandText: cleanText
        }
    }

    if (
        !cleanText.startsWith(prefix)
    ) {

        return null
    }

    const commandText =
        cleanText
            .slice(prefix.length)
            .trim()

    if (!commandText) {
        return null
    }

    return {
        usedPrefix: prefix,
        commandText
    }
}

function findNoPrefixPlugin(text) {

    const cleanText =
        String(text || '').trim()

    if (!cleanText) {
        return null
    }

    const parts =
        cleanText.split(/\s+/)

    const rawCommand =
        parts.shift() || ''

    const command =
        rawCommand
            .replace(
                /^[^a-zA-Z0-9]+/,
                ''
            )
            .toLowerCase()

    if (!command) {
        return null
    }

    for (
        const [
            ,
            plugin
        ]
        of Object.entries(
            global.jadiPlugins
        )
    ) {

        if (
            !plugin ||
            plugin.disabled ||
            !plugin.noPrefix ||
            !plugin.command
        ) {
            continue
        }

        const commands =
            Array.isArray(
                plugin.command
            )
                ? plugin.command
                : [plugin.command]

        const found =
            commands.some(
                cmd =>
                    String(cmd)
                        .toLowerCase() ===
                    command
            )

        if (!found) {
            continue
        }

        return {
            plugin,
            command,
            args: parts,
            text: parts.join(' '),
            usedPrefix: ''
        }
    }

    return null
}

export default async function subbotHandler(
    conn,
    message
) {

    try {

        const m =
            normalizeMessage(
                conn,
                message
            )

        if (!m.chat) {
            return
        }

        const botConfig =
            getCurrentSubbotConfig(
                conn
            )

        const prefix =
            typeof botConfig?.prefix === 'string'
                ? botConfig.prefix
                : ''

        const selfMode =
            String(
                botConfig?.self || 'off'
            )
                .trim()
                .toLowerCase()

        const used = {

            conn,

            sock:
                conn,

            m,

            message,

            isMainBot:
                false,

            isSubBot:
                true,

            args: [],

            text: '',

            command: '',

            usedPrefix:
                prefix,

            prefix:
                prefix,

            botConfig,

            self:
                selfMode === 'on'
        }

        if (
            selfMode === 'on'
        ) {

            const noPrefixPlugin =
                findNoPrefixPlugin(
                    m.text
                )

            const allowed =
                canUseSelfMode(
                    m,
                    conn,
                    botConfig
                )

            if (
                !allowed &&
                !noPrefixPlugin
            ) {
                return
            }
        }

        for (
            const [
                ,
                plugin
            ]
            of Object.entries(
                global.jadiPlugins
            )
        ) {

            if (
                !plugin ||
                plugin.disabled
            ) {
                continue
            }

            if (
                typeof plugin.before ===
                'function'
            ) {

                try {

                    await plugin.before(
                        m,
                        used
                    )

                } catch {
                }
            }

            if (
                typeof plugin.all ===
                'function'
            ) {

                try {

                    await plugin.all(
                        m,
                        used
                    )

                } catch {
                }
            }
        }

        if (!m.text) {
            return
        }

        const noPrefixPlugin =
            findNoPrefixPlugin(
                m.text
            )

        if (noPrefixPlugin) {

            used.args =
                noPrefixPlugin.args

            used.text =
                noPrefixPlugin.text

            used.command =
                noPrefixPlugin.command

            used.usedPrefix =
                noPrefixPlugin.usedPrefix

            used.prefix =
                prefix

            if (
                noPrefixPlugin.plugin
                    .onlyMainBot
            ) {
                return
            }

            if (
                typeof noPrefixPlugin.plugin.run ===
                'function'
            ) {

                await noPrefixPlugin.plugin.run(
                    m,
                    used
                )
            }

            return
        }

        const parsed =
            parseCommand(
                m.text,
                prefix
            )

        if (!parsed) {
            return
        }

        const commandText =
            parsed.commandText

        const parts =
            commandText.split(
                /\s+/
            )

        const command =
            parts
                .shift()
                .toLowerCase()

        const args =
            parts

        const textArgs =
            args.join(' ')

        used.args =
            args

        used.text =
            textArgs

        used.command =
            command

        used.usedPrefix =
            parsed.usedPrefix

        used.prefix =
            prefix

        for (
            const [
                ,
                plugin
            ]
            of Object.entries(
                global.jadiPlugins
            )
        ) {

            if (
                !plugin ||
                plugin.disabled
            ) {
                continue
            }

            if (!plugin.command) {
                continue
            }

            if (plugin.noPrefix) {
                continue
            }

            const commands =
                Array.isArray(
                    plugin.command
                )
                    ? plugin.command
                    : [plugin.command]

            const found =
                commands.some(
                    cmd =>
                        String(cmd)
                            .toLowerCase() ===
                        command
                )

            if (!found) {
                continue
            }

            if (
                plugin.onlyMainBot
            ) {
                continue
            }

            if (
                typeof plugin.run ===
                'function'
            ) {

                await plugin.run(
                    m,
                    used
                )
            }

            return
        }

    } catch {
        return
    }
}
