import { getAllSubBots } from '../../lib/subbots.js'

export default {
    command: ['bots', 'jadibots', 'sockets'],

    async run(m) {
        const subbotsObject = getAllSubBots() || {}
        
        // (Array)
        const botsList = Object.values(subbotsObject)

        if (botsList.length === 0) {
            return m.reply('*No se encontrarón Jadibots.*')
        }

        let texto = `          *ᴄᴏɴɴᴇᴄᴛᴇᴅ ᴊᴀᴅɪʙᴏᴛꜱ*         \n\n\n`

        let contador = 1

        for (const bot of botsList) {
            const isConnected = bot.connected || bot.status === 'connected'
            const status = isConnected ? 'ᴄᴏɴᴇᴄᴛᴀᴅᴏ' : 'ᴅᴇꜱᴄᴏɴᴇᴄᴛᴀᴅᴏ'
            
            // Limpiar el JID para mostrar solo el número limpio
            const cleanJid = bot.jid ? bot.jid.split('@')[0] : 'ᴅᴇꜱᴄᴏɴᴏᴄɪᴅᴏ'

            texto += `*${contador}* * ${cleanJid} | *${status}*`

            contador++
        }

        texto += `\n\n`

        await m.reply(texto)
    }
}
