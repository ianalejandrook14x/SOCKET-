/*
•❅──────✧✦✧──────❅•
Codigo Creado Por CUERVO-TEAM-SUPREME
Para Elymas-Bot Este Codigo Es 
Exclusivo Y Unico Para Este Bot Al 
Clonar O Copiar Dejar Estos Creditos 
De Cuervo-Team-Supreme
━━━━━ ☾☽ ━━━━━
ʚĭɞ ೃ CODIGO JAVASCRIPT ʚĭɞ ೃ
ʚĭɞ ೃ codigo :: plugins/convertidores/sticker.js
ʚĭɞ ೃ funcion :: creacion local de stickers con metadatos oficiales de Baileys
ʚĭɞ ೃ estado :: completo
──────✧✦✧──────
*/

import { downloadContentFromMessage } from '@itsliaaa/baileys'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import config from '../../config.js'
import { getSubbotConfig } from '../../lib/subbotconfig.js'

async function streamToBuffer(stream) {
    let buffer = Buffer.alloc(0)
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
}

function convertToWebp(inputPath, isVideo) {
    return new Promise((resolve, reject) => {
        const tmpOutput = path.join(process.cwd(), 'tmp', `${Date.now()}_out.webp`)
        
        const options = isVideo
            ? [
                '-vcodec', 'libwebp',
                '-vf', 'scale=320:320:force_original_aspect_ratio=decrease,fps=10,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
                '-loop', '0',
                '-ss', '00:00:00',
                '-t', '00:00:06',
                '-preset', 'default',
                '-an',
                '-vsync', '0'
            ]
            : [
                '-vcodec', 'libwebp',
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
                '-preset', 'default'
            ]

        ffmpeg(inputPath)
            .outputOptions(options)
            .toFormat('webp')
            .save(tmpOutput)
            .on('end', () => {
                try {
                    const resultBuffer = fs.readFileSync(tmpOutput)
                    if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput)
                    resolve(resultBuffer)
                } catch (err) {
                    reject(err)
                }
            })
            .on('error', (err) => {
                if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput)
                reject(err)
            })
    })
}

export default {
    command: ['sticker', 's', 'stiker'],

    async run(m, { conn, args }) {
        const rawJid = conn?.user?.jid || conn?.user?.id || conn?.subBotJid || ''
        const botData = getSubbotConfig(rawJid, config)

        const defaultPackname = botData.name || config.botName || 'Cuervo'
        const defaultAuthor = botData.ownerName || config.ownerName || 'TheDevil'

        const q = m.quoted ? m.quoted : m
        const rawMessage = q.message || q.msg || q

        const type = Object.keys(rawMessage).find(
            key => key === 'imageMessage' || key === 'videoMessage' || key === 'stickerMessage'
        )

        const mediaContent = rawMessage[type] || q

        if (!type && !q.mimetype) {
            return m.reply(
                '╭─「 🖼️ *STICKER MAKER* 」\n' +
                '│\n' +
                '│ ❌ Responde a una *imagen* o *video* con el comando.\n' +
                '│\n' +
                '│ 📌 *Ejemplos:*\n' +
                '│ • Responde a una imagen con `.s`\n' +
                '│ • Responde a una imagen con `.s Pack | Autor`\n' +
                '╰──────────────'
            )
        }

        const mime = mediaContent.mimetype || q.mimetype || ''

        if (mediaContent.seconds > 11) {
            return m.reply('❌ El video no puede durar más de 10 segundos.')
        }

        await m.reply('⏳ *Procesando sticker...*')

        const tmpDir = path.join(process.cwd(), 'tmp')
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

        const ext = mime.split('/')[1]?.split(';')[0] || 'tmp'
        const tmpInput = path.join(tmpDir, `${Date.now()}_in.${ext}`)

        try {
            let mediaBuffer
            try {
                const streamType = mime.split('/')[0]
                const stream = await downloadContentFromMessage(mediaContent, streamType)
                mediaBuffer = await streamToBuffer(stream)
            } catch (e) {
                if (typeof q.download === 'function') {
                    mediaBuffer = await q.download()
                }
            }

            if (!mediaBuffer || mediaBuffer.length === 0) {
                throw new Error('No se pudo extraer el archivo multimedia.')
            }

            fs.writeFileSync(tmpInput, mediaBuffer)

            const isVideo = mime.startsWith('video')
            const webpBuffer = await convertToWebp(tmpInput, isVideo)

            const text = args.join(' ')
            let packname = defaultPackname
            let author = defaultAuthor

            if (text.includes('|')) {
                const [p, a] = text.split('|')
                if (p && p.trim()) packname = p.trim()
                if (a && a.trim()) author = a.trim()
            } else if (text.trim()) {
                packname = text.trim()
            }

            if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput)

            return await conn.sendMessage(
                m.chat,
                { 
                    sticker: webpBuffer,
                    packname: packname,
                    author: author
                },
                { quoted: m }
            )

        } catch (error) {
            if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput)
            console.error('❌ Error en sticker.js:', error)
            return m.reply(
                '❌ Hubo un error al convertir el archivo a sticker.\n\n' +
                `📄 Detalle: ${error.message || error}`
            )
        }
    }
}
