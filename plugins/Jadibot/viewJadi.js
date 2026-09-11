import { getAllSubBots } from '../../lib/subbots.js'

export default {
    command: ['jadis', 'bots', 'jadibots', 'sockets'],

    async run(m, { conn }) {
        const subbotsObject = getAllSubBots() || {}
        const botsList = Object.values(subbotsObject)

        if (botsList.length === 0) {
            return m.reply('*No se encontrarón Jadibots.*')
        }

        let texto = `          *ᴄᴏɴɴᴇᴄᴛᴇᴅ ᴊᴀᴅɪʙᴏᴛꜱ*         \n\n\n`

        let contador = 1

        for (const bot of botsList) {
            const isConnected = bot.connected || bot.status === 'connected'
            const status = isConnected ? 'ᴄᴏɴᴇᴄᴛᴀᴅᴏ' : 'ᴅᴇꜱᴄᴏɴᴇᴄᴛᴀᴅᴏ'

            // JID del usuario
            const jid = bot.jid || ''
            const cleanJid = jid ? jid.split('@')[0] : 'ᴅᴇꜱᴄᴏɴᴏᴄɪᴅᴏ'

            // obtener el nombre
            let nombre = cleanJid

            try {
                if (jid && conn?.getName) {
                    const name = await conn.getName(jid)

                    if (name && typeof name === 'string' && name.trim()) {
                        nombre = name.trim()
                    }
                }
            } catch (e) {
                // Si no se puede obtener el nombre se mantiene el número
                nombre = cleanJid
            }

            texto += `*${contador}* * ${nombre} | *${status}*\n`

            contador++
        }

        texto += `\n`

        await m.reply(texto)
    }
}
