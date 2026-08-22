import fs from 'fs'
import path from 'path'
import config from '../../config.js'
import { getSubbotConfig } from '../../lib/subbotconfig.js'

export default {
    command: ['menu', 'menú', 'help', 'inicio'],

    async run(m, { conn, usedPrefix = '.' }) {
        const nombre = m.pushName || 'Usuario'

        const rawJid =
            conn?.user?.jid ||
            conn?.user?.id ||
            conn?.subBotJid ||
            ''

        const botData = getSubbotConfig(rawJid, config)

        const botName =
            botData.name ||
            config.botName ||
            'F I X X E D ボ'

        const ownerName =
            botData.ownerName ||
            config.ownerName ||
            'TewIanIx'

        const mediaUrl =
            botData.mediaUrl ||
            botData.image ||
            null

        const mediaType =
            botData.mediaType ||
            (botData.image ? 'image' : null)

        const pluginsDir = path.join(process.cwd(), 'plugins')
        const categories = {}

        // Buscar plugins y categorías
        try {
            const folders = fs.readdirSync(pluginsDir)

            for (const folder of folders) {
                const folderPath = path.join(pluginsDir, folder)

                if (!fs.statSync(folderPath).isDirectory())
                    continue

                const files = fs
                    .readdirSync(folderPath)
                    .filter(file => file.endsWith('.js'))

                for (const file of files) {
                    const filePath = path.join(folderPath, file)

                    try {
                        const pluginModule = await import(
                            `file://${filePath}`
                        )

                        const plugin =
                            pluginModule.default ||
                            pluginModule

                        if (!plugin || !plugin.command)
                            continue

                        if (!categories[folder]) {
                            categories[folder] = []
                        }

                        const commands = Array.isArray(plugin.command)
                            ? plugin.command
                            : [plugin.command]

                        const mainCmd = commands[0]

                        if (
                            mainCmd &&
                            !categories[folder].includes(mainCmd)
                        ) {
                            categories[folder].push(mainCmd)
                        }

                    } catch (e) {
                        console.error(
                            `Error al cargar el plugin ${file}:`,
                            e
                        )
                    }
                }
            }

        } catch (e) {
            console.error(
                'Error al leer el directorio de plugins:',
                e
            )
        }

        const sortedCategories = Object.keys(categories)
            .filter(category => categories[category]?.length)
            .sort()

        const totalCommands = sortedCategories.reduce(
            (total, category) =>
                total + categories[category].length,
            0
        )

        // Menú
        let menuText = ''

        menuText += `Hola, ${nombre}\n\n`
        menuText += `Bot: ${botName}\n`
        menuText += `Comandos: ${totalCommands}\n`
        menuText += `Categorias: ${sortedCategories.length}\n\n`

        for (const category of sortedCategories) {
            menuText += `${category.toUpperCase()}\n`

            for (const cmd of categories[category]) {
                menuText += `${usedPrefix}${cmd}\n`
            }

            menuText += `\n`
        }

        const buttons = [
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: 'Actualizar menu',
                    id: `${usedPrefix}menu`
                })
            }
        ]

        if (sortedCategories.length) {
            buttons.push({
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: 'Ver categorias',

                    sections: [
                        {
                            title: 'Categorias',

                            rows: sortedCategories.map(category => ({
                                title: category.toUpperCase(),

                                description:
                                    `${categories[category].length} comandos`,

                                id:
                                    `${usedPrefix}menu ${category}`
                            }))
                        }
                    ]
                })
            })
        }

        if (typeof conn.sendIAMessage === 'function') {

            const options = {
                caption: menuText,
                footer: botName,

                multiple: {
                    list_title: 'Selecciona una categoria',
                    button_title: 'Ver categorias'
                }
            }

            if (
                mediaUrl &&
                (mediaType === 'image' || mediaType === 'video')
            ) {
                options.media = mediaUrl
            }

            await conn.sendIAMessage(
                m.chat,
                buttons,
                m,
                options
            )

        } else {
            await m.reply(menuText)
        }
    }
}
