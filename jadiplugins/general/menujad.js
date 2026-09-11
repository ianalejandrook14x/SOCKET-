import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { prepareWAMessageMedia } from '@itsliaaa/baileys'
import config from '../../config.js'
import { getSubbotConfig } from '../../lib/subbotconfig.js'

function getCategoryIcon(category) {
    const icons = {
        general: ''
    }

    return icons[category.toLowerCase()] || '☁'
}

export default {
    command: ['menu', 'menú', 'help', 'inicio', 'ayuda'],

    async run(m, { conn, usedPrefix = 'sιᥒ ρrᥱfιx' }) {

        const nombre = m.pushName || 'Usuario'


        const defaultConfig = conn.isSubBot
            ? getSubbotConfig(conn.subBotJid)
            : config

        const botName =
            defaultConfig?.botName ||
            config?.botName ||
            'sᥲtsυkι tᥲᥴhιbᥲᥒᥲ'

        const ownerName =
            defaultConfig?.ownerName ||
            'tᥱwιᥲᥒιx'

        const ownerNumber =
            defaultConfig?.ownerNumber ||
            config?.ownerNumber ||
            null

        const mediaUrl =
            defaultConfig?.mediaUrl ||
            'https://files.catbox.moe/fhnqaa.jpg'

        const previewTitle = botName
        const previewBody = `for ${ownerName}`
        const previewUrl = 'https://tewianix.org'
        const previewImage = mediaUrl

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

        const pluginsDir = path.join(process.cwd(), 'jadiplugins')
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
                        const pluginModule = await import(
                            `file://${filePath}?menu=${Date.now()}`
                        )

                        const plugin =
                            pluginModule.default || pluginModule

                        if (!plugin || !plugin.command) continue

                        const mainCmd = Array.isArray(plugin.command)
                            ? plugin.command[0]
                            : plugin.command

                        if (!mainCmd) continue

                        const commandName =
                            String(mainCmd).toLowerCase()

                        const isExcluded =
                            excludedCommands.some(
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
            `hoᥣᥲ, *\`${nombre}\`* 🍃\n\n` +
            `ᥱstᥱ ᥱs ᥱᥣ mᥱᥒυ dᥱᥣ jᥲdιbot tᥱᥒdrᥲ.\n` +
            `dᥱsᥴᥲrgᥲs, bυsᥴᥲdor, jυᥱgos.\n\n` +
            `ɴᴏᴍʙʀᴇ: *${botName}*\n` +
            `ᴘʀᴇꜰɪᴊᴏ: *sιᥒ ρrᥱfιx*\n` +
            `ᴅᴇᴠ: *${ownerName}*\n\n`

        for (const [category, commands] of Object.entries(categories)) {
            if (commands.length === 0) continue

            const icon = getCategoryIcon(category)
            const catName = category.toUpperCase()

            menuText += `> ${icon} | *${catName}* \`೯\`\n\n`

            for (const cmd of commands) {
                menuText += `> *\`${usedPrefix}${cmd}\`*\n`
            }

            menuText +=
                `\n*ʚꕁꕁꕁ━━ ❀ ━━ꕁꕁꕁɞ*\n\n`
        }

        let linkPreview

        try {
            const imageResponse = await fetch(previewImage)

            if (!imageResponse.ok) {
                throw new Error(`HTTP ${imageResponse.status}`)
            }

            const originalBuffer = Buffer.from(
                await imageResponse.arrayBuffer()
            )

            const thumbnailBuffer = await sharp(originalBuffer)
                .resize(1280, 720, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({
                    quality: 90
                })
                .toBuffer()

            const { imageMessage } =
                await prepareWAMessageMedia(
                    {
                        image: thumbnailBuffer
                    },
                    {
                        upload: conn.waUploadToServer,
                        mediaTypeOverride: 'thumbnail-link'
                    }
                )

            if (imageMessage) {
                imageMessage.width = 1280
                imageMessage.height = 720
            }

            linkPreview = {
                'canonical-url': previewUrl,
                'matched-text': previewUrl,
                title: previewTitle,
                description: previewBody,
                previewType: 0,
                jpegThumbnail: thumbnailBuffer,
                highQualityThumbnail: imageMessage,
                linkPreviewMetadata: {
                    linkMediaDuration: 0,
                    socialMediaPostType: 4
                }
            }

        } catch (e) {
            console.error(
                'Error al generar la vista previa:',
                e
            )
        }

        await conn.sendMessage(
            m.chat,
            {
                text: `${previewUrl}\n\n${menuText}`,
                linkPreview
            },
            {
                quoted: m
            }
        )
    }
}
