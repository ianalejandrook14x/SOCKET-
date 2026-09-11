import { saveSubbotConfig, validateSubbotOwner } from '../../lib/subbotconfig.js'

export default {
    command: ['setname', 'setnamebot', 'setbotname', 'jadi-name'],

    async run(m, { conn, text }) {
        const auth = validateSubbotOwner(m, conn)
        if (!auth.allowed) return m.reply(auth.reason)

        if (!text) return m.reply('*Ingresa el nombre para el Jadibot*')

        const botJid = conn?.user?.jid || conn?.user?.id || conn?.subBotJid

        saveSubbotConfig(botJid, { name: text.trim() })

        return m.reply(`> Nombre cambiado a: *${text.trim()}*`)
    }
}
