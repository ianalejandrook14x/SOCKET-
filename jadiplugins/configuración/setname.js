import {
    saveSubbotConfig,
    validateSubbotOwner,
    getSubbotConfig
} from '../../lib/subbotconfig.js'

export default {

    command: [
        'setname',
        'setnamebot',
        'setbotname',
        'jadi-name'
    ],

    async run(m, { conn, text }) {

        if (!conn?.isSubBot && !conn?.isSubbot) {
            return
        }

        const botJid =
            conn?.subBotJid ||
            conn?.user?.jid ||
            conn?.user?.id ||
            ''

        if (!botJid) {
            console.error(
                '[SETNAME] No se pudo identificar el JID del Jadibot.'
            )

            return
        }

        const auth = validateSubbotOwner(m, conn)

        if (!auth.allowed) {
            return
        }

        if (!text?.trim()) {
            return m.reply(
                '*ɪɴɢʀᴇꜱᴀ ᴇʟ ɴᴏᴍʙʀᴇ ᴘᴀʀᴀ ᴇʟ ᴊᴀᴅɪʙᴏᴛ*'
            )
        }

        const newName = text.trim()

        if (newName.length > 20) {
            return m.reply(
                '*ᴇʟ ɴᴏᴍʙʀᴇ ɴᴏ ᴘᴜᴇᴅᴇ ᴛᴇɴᴇʀ ᴍᴀ́s ᴅᴇ 20 ᴄᴀʀᴀᴄᴛᴇʀᴇs.*'
            )
        }

        saveSubbotConfig(botJid, {
            name: newName
        })

        return m.reply(
            `ɴᴏᴍʙʀᴇ ᴄᴀᴍʙɪᴀᴅᴏ ᴀ: *${newName}*`
        )
    }
}
