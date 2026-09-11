import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pluginsPath = path.join(__dirname, 'jadiplugins')

global.jadiPlugins = global.jadiPlugins || {}

function getAllFiles(directory) {
    let files = []

    if (!fs.existsSync(directory)) {
        return files
    }

    const items = fs.readdirSync(directory)

    for (const item of items) {
        const fullPath = path.join(directory, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
            files.push(...getAllFiles(fullPath))
        } else {
            files.push(fullPath)
        }
    }

    return files
}

export async function loadSubbotPlugins() {
    try {
        if (!fs.existsSync(pluginsPath)) {
            fs.mkdirSync(pluginsPath, { recursive: true })

            console.log(
                'Carpeta jadiplugins creada correctamente'
            )
        }

        const files = getAllFiles(pluginsPath)

        let loaded = 0

        for (const file of files) {
            if (!file.endsWith('.js')) {
                continue
            }

            try {
                const fileUrl = pathToFileURL(file).href

                const imported = await import(
                    `${fileUrl}?subbot=${Date.now()}`
                )

                const plugin = imported.default || imported

                if (!plugin) {
                    continue
                }

                const pluginName = path.relative(
                    pluginsPath,
                    file
                )

                global.jadiPlugins[pluginName] = plugin

                loaded++

                console.log(
                    `Plugin Jadibot cargado: ${pluginName}`
                )

            } catch (error) {
                console.error(
                    `Error cargando plugin para Jadibot: ${file}`,
                    error
                )
            }
        }

        console.log(
            `Plugins disponibles para Jadibots: ${loaded}`
        )

        return loaded

    } catch (error) {
        console.error(
            'Error cargando los plugins de Jadibots:',
            error
        )

        return 0
    }
}

function getMessageText(m) {
    const message = m.message

    if (!message) {
        return ''
    }

    if (message.conversation) {
        return message.conversation
    }

    if (message.extendedTextMessage) {
        return message.extendedTextMessage.text || ''
    }

    if (message.imageMessage) {
        return message.imageMessage.caption || ''
    }

    if (message.videoMessage) {
        return message.videoMessage.caption || ''
    }

    if (message.buttonsResponseMessage) {
        return (
            message.buttonsResponseMessage
                .selectedButtonId || ''
        )
    }

    if (message.listResponseMessage) {
        return (
            message.listResponseMessage
                .singleSelectReply
                ?.selectedRowId || ''
        )
    }

    if (message.templateButtonReplyMessage) {
        return (
            message.templateButtonReplyMessage
                .selectedId || ''
        )
    }

    if (message.interactiveResponseMessage) {
        try {
            const params = JSON.parse(
                message.interactiveResponseMessage
                    ?.nativeFlowResponseMessage
                    ?.paramsJson || '{}'
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
        m.message?.extendedTextMessage?.contextInfo

    if (!contextInfo?.quotedMessage) {
        return null
    }

    return {
        key: {
            remoteJid: m.chat,

            fromMe:
                contextInfo.participant ===
                m.key?.participant,

            id: contextInfo.stanzaId,

            participant:
                contextInfo.participant
        },

        message:
            contextInfo.quotedMessage
    }
}

function normalizeMessage(conn, message) {
    const m = message

    m.id = m.key?.id

    m.chat = m.key?.remoteJid

    m.sender =
        m.key?.participant ||
        m.key?.remoteJid

    m.fromMe = Boolean(
        m.key?.fromMe
    )

    m.text = getMessageText(m)

    m.quoted =
        getQuotedMessage(m)

    m.isGroup = Boolean(
        m.chat?.endsWith('@g.us')
    )

    m.isSubBot = true
    m.isMainBot = false

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

export default async function subbotHandler(
    conn,
    message
) {
    try {
        const m = normalizeMessage(
            conn,
            message
        )

        if (!m.chat) {
            return
        }

        const used = {
            conn,
            sock: conn,

            m,
            message,

            isMainBot: false,
            isSubBot: true
        }

        for (const [
            ,
            plugin
        ] of Object.entries(
            global.jadiPlugins
        )) {
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
                } catch (error) {
                    console.error(
                        'Error en jadiPlugin.before:',
                        error
                    )
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
                } catch (error) {
                    console.error(
                        'Error en jadiPlugin.all:',
                        error
                    )
                }
            }
        }

        if (!m.text) {
            return
        }

        const text =
            m.text.trim()

        if (!text) {
            return
        }

        const parts =
            text.split(/\s+/)

        const command =
            parts
                .shift()
                .toLowerCase()

        const args = parts

        const textArgs =
            args.join(' ')

        used.args =
            args

        used.text =
            textArgs

        used.command =
            command

        used.usedPrefix =
            ''

        used.prefix =
            ''

        for (const [
            ,
            plugin
        ] of Object.entries(
            global.jadiPlugins
        )) {
            if (
                !plugin ||
                plugin.disabled
            ) {
                continue
            }

            if (!plugin.command) {
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

    } catch (error) {
        console.error(
            'Error en jadi-handler:',
            error
        )
    }
}
