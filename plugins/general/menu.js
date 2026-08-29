import fs from 'fs'
import path from 'path'
import {
    prepareWAMessageMedia,
    generateWAMessageFromContent
} from '@whiskeysockets/baileys'

function getCategoryIcon(category) {
    const icons = {
        'general': '✿',
        'downloader': '✿'
    }

    return icons[category.toLowerCase()] || '✿'
}

async function getBuffer(url) {
    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`Error descargando imagen: ${response.status}`)
    }

    return Buffer.from(await response.arrayBuffer())
}

export default {
    command: ['menu', 'menú', 'help', 'inicio', 'ayuda'],

    async run(m, { conn, usedPrefix = '.' }) {
        const nombre = m.pushName || 'Usuario'

        const previewTitle = 'sᥲtsυkι tᥲᥴhιbᥲᥒᥲ'
        const previewBody = 'for tᥱwιᥲᥒιx'
        const previewUrl = 'https://ws.ianalejandrook15x.site'
        const previewImage = 'https://files.catbox.moe/7y3cph.jpeg'

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

            menuText += `${icon} | ${catName}\n\n`

            for (const cmd of commands) {
                menuText += `${usedPrefix}${cmd}\n`
            }

            menuText += `━━━━━━━━━━━━━━━ ✿\n`
        }

        menuText += `bყ ιᥲᥒᥣᥱjᥲᥒdrook16x`

        try {
            const imageBuffer = await getBuffer(previewImage)

            const media = await prepareWAMessageMedia(
                { image: imageBuffer },
                {
                    upload: conn.waUploadToServer,
                    mediaTypeOverride: 'thumbnail-link'
                }
            )

            const imageMessage = media.imageMessage

            const getTs = (ts) =>
                typeof ts === 'object'
                    ? Number(ts?.low || ts)
                    : Number(ts)

            const content = {
                extendedTextMessage: {
                    text: menuText,

                    matchedText: previewUrl,
                    canonicalUrl: previewUrl,

                    description: previewBody,
                    title: previewTitle,

                    previewType: 0,

                    jpegThumbnail: imageMessage.jpegThumbnail,
                    thumbnailDirectPath: imageMessage.directPath,
                    thumbnailSha256: imageMessage.fileSha256,
                    thumbnailEncSha256: imageMessage.fileEncSha256,
                    mediaKey: imageMessage.mediaKey,
                    mediaKeyTimestamp: getTs(
                        imageMessage.mediaKeyTimestamp
                    ),

                    thumbnailHeight: imageMessage.height || 1080,
                    thumbnailWidth: imageMessage.width || 1920,

                    contextInfo: {}
                }
            }

            const waMsg = generateWAMessageFromContent(
                m.chat,
                content,
                {
                    userJid: conn.user?.id,
                    quoted: m
                }
            )

            await conn.relayMessage(
                m.chat,
                waMsg.message,
                {
                    messageId: waMsg.key.id
                }
            )

        } catch (e) {
            console.error(
                'Error al generar el link preview del menú:',
                e
            )

            // Fallback: enviar el menú normalmente si falla la preview
            await conn.sendMessage(
                m.chat,
                {
                    text: menuText
                },
                {
                    quoted: m
                }
            )
        }
    }
}
