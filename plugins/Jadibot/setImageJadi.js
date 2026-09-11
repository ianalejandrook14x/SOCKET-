import { saveSubbotConfig, validateSubbotOwner } from '../../lib/subbotconfig.js'

export default {
    command: ['setimage', 'setimagebot', 'setbotfoto', 'setfoto', 'setbotvideo', 'setvideo'],

    async run(m, { conn, text }) {
        const auth = validateSubbotOwner(m, conn)
        if (!auth.allowed) return m.reply(auth.reason)

        let mediaUrl = ''

        if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
            mediaUrl = text.trim()
        } 
        else if (m.quoted && /image|video/.test(m.quoted.mtype || m.quoted.mediaType)) {
            return m.reply('*Ingresa un enlace para establecer como imagen/video*\n> *Ejem: #setimage https://xxxxx*')
        }

        if (!mediaUrl) {
            return m.reply(
                '*Solo se aceptan URL válidas.*\n\n'
            )
        }

        const isVideo = /\.(mp4|mov|avi|mkv|webm|gif)($|\?)/i.test(mediaUrl)
        const mediaType = isVideo ? 'video' : 'image'

        const botJid = conn?.user?.jid || conn?.user?.id || conn?.subBotJid

        saveSubbotConfig(botJid, { 
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            image: mediaUrl 
        })

        return m.reply(`*Se realizo el cambio a (${mediaType.toUpperCase()}) en este Jadibot.*`)
    }
}
