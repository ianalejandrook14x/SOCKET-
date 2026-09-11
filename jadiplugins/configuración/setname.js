import {
    saveSubbotConfig,
    getSubbotConfig,
    validateSubbotOwner
} from '../../lib/subbotconfig.js'


export default {

    command: [
        'setname',
        'setnamebot',
        'setbotname',
        'jadi-name'
    ],


    async run(
        m,
        {
            conn,
            text = ''
        }
    ) {

        if (
            !conn?.isSubBot &&
            !conn?.isSubbot
        ) {
            return
        }

        const botJid =
            conn?.subBotJid ||
            conn?.user?.jid ||
            conn?.user?.id ||
            ''


        if (!botJid) {

            console.error(
                '[SETNAME] No se pudo identificar el Jadibot.'
            )

            return
        }

        const botConfig =
            getSubbotConfig(
                botJid
            )


        const emoji =
            String(
                botConfig?.emoji ||
                '🍃'
            )

        const permission =
            validateSubbotOwner(
                m,
                conn
            )


        if (
            !permission?.allowed
        ) {

            console.log(
                `[SETNAME] SIN PERMISO | ` +
                `Jadibot: ${botJid} | ` +
                `Sender: ${m?.sender || 'desconocido'}`
            )

            return
        }

        const newName =
            String(
                text || ''
            )
                .trim()


        if (!newName) {

            return m.reply(
                `${emoji} *ɪɴɢʀᴇꜱᴀ ᴇʟ ɴᴏᴍʙʀᴇ ᴘᴀʀᴀ ᴇʟ ᴊᴀᴅɪʙᴏᴛ*`
            )
        }

        if (
            newName.length > 20
        ) {

            return m.reply(
                `${emoji} *ᴇʟ ɴᴏᴍʙʀᴇ ɴᴏ ᴘᴜᴇᴅᴇ ᴛᴇɴᴇʀ ᴍᴀ́s ᴅᴇ 20 ᴄᴀʀᴀᴄᴛᴇʀᴇs.*`
            )
        }

        const saved =
            saveSubbotConfig(
                botJid,
                {
                    name: newName
                }
            )


        if (!saved) {

            return m.reply(
                `${emoji} *ɴᴏ ꜱᴇ ᴘᴜᴅᴏ ɢᴜᴀʀᴅᴀʀ ᴇʟ ɴᴏᴍʙʀᴇ.*`
            )
        }

        return m.reply(
            `${emoji} ɴᴏᴍʙʀᴇ ᴄᴀᴍʙɪᴀᴅᴏ ᴀ: *${newName}*`
        )
    }
}
