import {
    getSubbotConfig,
    saveSubbotConfig,
    validateSubbotOwner
} from '../../lib/subbotconfig.js'


export default {

    command: [
        'setemoji',
        'setemote',
        'emoji'
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
                '[SETEMOJI] No se pudo identificar el Jadibot.'
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
                `[SETEMOJI] SIN PERMISO | ` +
                `Jadibot: ${botJid} | ` +
                `Sender: ${m?.sender || 'desconocido'}`
            )

            return
        }


        if (
            !String(text).trim()
        ) {

            return m.reply(
                `${emoji} ᴇᴍᴏᴊɪ ᴀᴄᴛᴜᴀʟ: ${emoji}`
            )
        }

        const newEmoji =
            String(text)
                .trim()


        if (
            newEmoji.length > 10
        ) {

            return m.reply(
                `${emoji} *ᴜsᴀ ᴜɴ ᴇᴍᴏᴊɪ ᴠᴀ́ʟɪᴅᴏ.*`
            )
        }


        const saved =
            saveSubbotConfig(
                botJid,
                {
                    emoji: newEmoji
                }
            )


        if (!saved) {

            return m.reply(
                `${emoji} *ɴᴏ ꜱᴇ ᴘᴜᴅᴏ ɢᴜᴀʀᴅᴀʀ ᴇʟ ᴇᴍᴏᴊɪ.*`
            )
        }


        return m.reply(
            `${newEmoji} ᴇᴍᴏᴊɪ ᴄᴀᴍʙɪᴀᴅᴏ ᴀ: ${newEmoji}`
        )
    }
}
