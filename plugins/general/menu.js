import fs from 'fs'
import path from 'path'

function getCategoryIcon(category) {
    const icons = {
        'general': '✿',
        'downloader': '✿'
    }

    return icons[category.toLowerCase()] || '✿'
}

export default {
    command: ['menu', 'menú', 'help', 'inicio'],

    async run(m, { conn, usedPrefix = '.' }) {
        const nombre = m.pushName || 'Usuario'

        const previewTitle = 'sᥲtsυkι tᥲᥴhιbᥲᥒᥲ'
        const previewBody = 'For TewIanIx'
        const previewUrl = 'https://ws.ianalejandrook15x.site'
        const previewImage = 'https://d.uguu.se/WFTURVKV.jpeg'

        const excludedCommands = [
            'imagen',
            'imagenes',
            'imágenes',
            'image',
            'images',
            'img',
            'buscarimagen',
            'buscarimagenes',
            'buscarimágenes',
            'googleimagen',
            'googleimagenes',
            'googleimages',
            'pinterest',
            'pin',
            'pixiv',
            'unsplash',
            'wallpaper'
        ]

        const pluginsDir = path.join(process.cwd(), 'plugins')
        const categories = {}

        try {
            const folders = fs.readdirSync(pluginsDir)

            for (const folder of folders) {
                const folderPath = path.join(pluginsDir, folder)

                if (!fs.statSync(folderPath).isDirectory()) continue

                const files = fs
                    .readdirSync(folderPath)
                    .filter(file => file.endsWith('.js'))

                for (const file of files) {
                    const filePath = path.join(folderPath, file)

                    try {
                        const pluginModule = await import(`file://${filePath}`)
                        const plugin = pluginModule.default || pluginModule

                        if (!plugin || !plugin.command) continue

                        const mainCmd = Array.isArray(plugin.command)
                            ? plugin.command[0]
                            : plugin.command

                        if (!mainCmd) continue

                        const commandName = String(mainCmd).toLowerCase()

                        const isExcluded = excludedCommands.some(
                            excluded =>
                                commandName === excluded ||
                                commandName.includes(excluded)
                        )

                        if (isExcluded) continue

                        if (!categories[folder]) {
                            categories[folder] = []
                        }

                        categories[folder].push(mainCmd)

                    } catch (e) {
                        console.error(
                            `Error al cargar el plugin ${file} para el menú:`,
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

        let menuText =
            `━━━━━━━━━━━━━━━ ✿\n` +
            `Hola, *${nombre}*\nSoy *sᥲtsυkι tᥲᥴhιbᥲᥒᥲ*\n\n`

        for (const [category, commands] of Object.entries(categories)) {
            if (commands.length === 0) continue

            const icon = getCategoryIcon(category)
            const catName = category.toUpperCase()

            menuText += `${icon} | ${catName}\n`

            for (const cmd of commands) {
                menuText += `${usedPrefix}${cmd}\n\n`
            }

            menuText += `━━━━━━━━━━━━━━━ ✿\n\n`
        }

        menuText += `bყ ιᥲᥒᥣᥱjᥲᥒdrook16x`

        let thumbnail

        try {
            const imageResponse = await fetch(previewImage)

            if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer()
                thumbnail = Buffer.from(imageBuffer)
            }
        } catch (e) {
            console.error(
                'Error al descargar la imagen del menú:',
                e
            )
        }

        await conn.sendMessage(
            m.chat,
            {
                text: menuText,
                contextInfo: {
                    externalAdReply: {
                        title: previewTitle,
                        body: previewBody,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        thumbnail: thumbnail,
                        sourceUrl: previewUrl,
                        showAdAttribution: false
                    }
                }
            },
            {
                quoted: m
            }
        )
    }
}
