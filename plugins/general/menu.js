import fs from 'fs'
import path from 'path'
import config from '../../config.js'
import { getSubbotConfig } from '../../lib/subbotconfig.js'

function getCategoryIcon(category) {
    const icons = {
        'general': 'ボ'
    }
    return icons[category.toLowerCase()] || '📁'
}

export default {
    command: ['menu', 'menú', 'help', 'inicio'],

    async run(m, { conn, usedPrefix = '.' }) {
        const nombre = m.pushName || 'Usuario'
        const rawJid = conn?.user?.jid || conn?.user?.id || conn?.subBotJid || ''
        const botData = getSubbotConfig(rawJid, config)

        const botName = botData.name || config.botName || 'F I X X E D ボ'
        const ownerName = botData.ownerName || config.ownerName || 'TewIanIx'
        
        // Obtenemos la media guardada (o fallback a la propiedad image antigua)
        const mediaUrl = botData.mediaUrl || botData.image
        const mediaType = botData.mediaType || (botData.image ? 'image' : null)

        const pluginsDir = path.join(process.cwd(), 'plugins')
        const categories = {}

        try {
            const folders = fs.readdirSync(pluginsDir)

            for (const folder of folders) {
                const folderPath = path.join(pluginsDir, folder)
                
                if (fs.statSync(folderPath).isDirectory()) {
                    const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'))

                    for (const file of files) {
                        const filePath = path.join(folderPath, file)
                        try {
                            const pluginModule = await import(`file://${filePath}`)
                            const plugin = pluginModule.default || pluginModule

                            if (plugin && plugin.command) {
                                if (!categories[folder]) {
                                    categories[folder] = []
                                }

                                const mainCmd = Array.isArray(plugin.command) ? plugin.command[0] : plugin.command
                                if (mainCmd) {
                                    categories[folder].push(mainCmd)
                                }
                            }
                        } catch (e) {
                            console.error(`Error al cargar el plugin ${file} para el menú:`, e)
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error al leer el directorio de plugins:', e)
        }

        let menuText = `━━━━━━━━━━━━━━━━━━━━━━━━\n`
        
        menuText += `Hola, *${nombre}*\n\n`

        for (const [category, commands] of Object.entries(categories)) {
            if (commands.length === 0) continue

            const icon = getCategoryIcon(category)
            const catName = category.toUpperCase()

            menuText += `${icon} | ${catName} 〕\n`
            for (const cmd of commands) {
                menuText += `${usedPrefix}${cmd}\n`
            }
            menuText += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        }

        menuText += ` *${botName.toUpperCase()}*`

        if (mediaUrl) {
            if (mediaType === 'video') {
                await conn.sendMessage(m.chat, {
                    video: { url: mediaUrl },
                    caption: menuText,
                    ptv: true
                }, { quoted: m })
                await m.reply(menuText)
            } else {
                await conn.sendMessage(m.chat, {
                    image: { url: mediaUrl },
                    caption: menuText
                }, { quoted: m })
            }
        } else {
            await m.reply(menuText)
        }
    }
}
