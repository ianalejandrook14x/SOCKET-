import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import config from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pluginsPath = path.join(__dirname, 'plugins')

global.plugins = global.plugins || {}

function getAllFiles(directory) {
    let files = []
    if (!fs.existsSync(directory)) return files

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

export async function loadPlugins() {
    if (!fs.existsSync(pluginsPath)) {
        fs.mkdirSync(pluginsPath, { recursive: true })
    }

    const files = getAllFiles(pluginsPath)
    let loaded = 0

    for (const file of files) {
        if (!file.endsWith('.js')) continue

        try {
            const fileUrl = pathToFileURL(file).href
            const imported = await import(`${fileUrl}?update=${Date.now()}`)
            const plugin = imported.default || imported
            const pluginName = path.relative(pluginsPath, file)

            global.plugins[pluginName] = plugin
            loaded++
        } catch (error) {
            console.error(`Error plugin: ${file}`, error)
        }
    }

    console.log(`Plugins cargados: ${loaded}`)
}

function getMessageText(m) {
    const message = m.message
    if (!message) return ''

    if (message.conversation) return message.conversation
    if (message.extendedTextMessage) return message.extendedTextMessage.text || ''
    if (message.imageMessage) return message.imageMessage.caption || ''
    if (message.videoMessage) return message.videoMessage.caption || ''
    if (message.buttonsResponseMessage) return message.buttonsResponseMessage.selectedButtonId || ''
    if (message.listResponseMessage) return message.listResponseMessage.singleSelectReply?.selectedRowId || ''
    if (message.templateButtonReplyMessage) return message.templateButtonReplyMessage.selectedId || ''

    if (message.interactiveResponseMessage) {
        try {
            const params = JSON.parse(message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '{}')
            return params.id || params.selectedId || ''
        } catch {
            return ''
        }
    }

    return ''
}

function getQuotedMessage(m) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo
    if (!contextInfo?.quotedMessage) return null

    return {
        key: {
            remoteJid: m.chat,
            fromMe: contextInfo.participant === m.key?.participant,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant
        },
        message: contextInfo.quotedMessage
    }
}

function normalizeMessage(conn, message) {
    const m = message

    m.id = m.key?.id
    m.chat = m.key?.remoteJid
    m.sender = m.key?.participant || m.key?.remoteJid
    m.fromMe = Boolean(m.key?.fromMe)
    m.text = getMessageText(m)
    m.quoted = getQuotedMessage(m)
    m.isGroup = Boolean(m.chat?.endsWith('@g.us'))
    m.isMainBot = Boolean(conn.isMainBot)
    m.isSubBot = !m.isMainBot

    m.reply = async (text, options = {}) => {
        return conn.sendMessage(m.chat, { text: String(text), ...options }, { quoted: m })
    }

    m.send = async (content, options = {}) => {
        return conn.sendMessage(m.chat, content, { quoted: m, ...options })
    }

    m.react = async (emoji) => {
        return conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
    }

    return m
}

function getPrefix(text) {
    const prefixes = config.prefixes || ['#']
    for (const prefix of prefixes) {
        if (text.startsWith(prefix)) return prefix
    }
    return ''
}

export default async function handler(conn, message) {
    try {
        const m = normalizeMessage(conn, message)
        if (!m.chat) return

        const used = {
            conn,
            sock: conn,
            m,
            message,
            isMainBot: m.isMainBot,
            isSubBot: m.isSubBot
        }

        // 1. EJECUCIÓN DE EVENTOS PREVENTIVOS (before, all, detector AntiLink, etc.)
        for (const [, plugin] of Object.entries(global.plugins)) {
            if (!plugin || plugin.disabled) continue

            // Ejecutar la función before si existe en el plugin
            if (typeof plugin.before === 'function') {
                try {
                    await plugin.before(m, used)
                } catch (e) {
                    console.error('Error ejecutando plugin.before:', e)
                }
            }

            // Ejecutar la función all si existe en el plugin
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all(m, used)
                } catch (e) {
                    console.error('Error ejecutando plugin.all:', e)
                }
            }
        }

        // Si no hay texto en el mensaje, finalizamos después de evaluar eventos
        if (!m.text) return

        const text = m.text.trim()
        if (!text) return

        const prefix = getPrefix(text)
        let body = text
        let usedPrefix = ''

        if (prefix) {
            usedPrefix = prefix
            body = text.slice(prefix.length).trim()
        } else {
            // Si el mensaje no lleva prefijo, no es un comando explícito
            return
        }

        if (!body) return

        const parts = body.split(/\s+/)
        const command = parts.shift().toLowerCase()
        const args = parts
        const textArgs = args.join(' ')

        used.args = args
        used.text = textArgs
        used.command = command
        used.usedPrefix = usedPrefix
        used.prefix = prefix

        // 2. EJECUCIÓN DE COMANDOS REGULARES
        for (const [, plugin] of Object.entries(global.plugins)) {
            if (!plugin || plugin.disabled || !plugin.command) continue

            const commands = Array.isArray(plugin.command) ? plugin.command : [plugin.command]
            const found = commands.some(cmd => String(cmd).toLowerCase() === command)

            if (!found) continue

            if (plugin.onlyMainBot && m.isSubBot) {
                return m.reply('Este comando solo puede ejecutarse en el bot principal.')
            }

            if (plugin.onlySubBot && m.isMainBot) {
                return m.reply('Este comando solo puede ejecutarse en un Jadibot.')
            }

            if (typeof plugin.run === 'function') {
                await plugin.run(m, used)
            }

            return
        }

    } catch (error) {
        console.error('Error en handler:', error)
    }
}
