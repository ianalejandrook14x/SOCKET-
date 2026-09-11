import {
    isTikTokUrl,
    extractTikTokUrl,
    hasHD,
    downloadTikTok
} from '../../lib/tiktok.js'

export default {
    command: [],

    async run(m, { conn }) {
        const text =
            m.text ||
            m.body ||
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            ''

        if (!isTikTokUrl(text)) return

        const url = extractTikTokUrl(text)

        if (!url) return

        const hd = hasHD(text)

        try {
            const result = await downloadTikTok(url, hd)

            if (!result?.buffer?.length) {
                throw new Error('El vídeo descargado está vacío')
            }

            await conn.sendMessage(
                m.chat,
                {
                    video: result.buffer,
                    mimetype: 'video/mp4'
                },
                {
                    quoted: m
                }
            )
        } catch (error) {
            console.error('[TikTok]', error)

            await m.reply(
                '*No se pudo descargar ese video*'
            )
        }
    }
          }
