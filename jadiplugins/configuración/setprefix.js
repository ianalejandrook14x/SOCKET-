import {
    getSubbotConfig,
    saveSubbotConfig,
    validateSubbotOwner
} from '../../lib/subbotconfig.js'


export default {

    command: [
        'setprefix',
        'setprefijo',
        'prefijo',
        'prefix'
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
                '[SETPREFIX] No se pudo identificar el Jadibot.'
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
                `[SETPREFIX] SIN PERMISO | ` +
                `Jadibot: ${botJid} | ` +
                `Sender: ${m?.sender || 'desconocido'}`
            )

            return
        }

        if (
            text === undefined ||
            text === null ||
            String(text).trim() === ''
        ) {

            return m.reply(
                `${emoji} ᴘʀᴇꜰɪᴊᴏ ᴀᴄᴛᴜᴀʟ: *${
                    botConfig?.prefix || 'ꜱɪɴ ᴘʀᴇꜰɪx'
                }*`
            )
        }

        const newPrefix =
            String(text)
                .trim()


        if (
            newPrefix.toLowerCase() === '' ||
            newPrefix.toLowerCase() === ' ' ||
            newPrefix.toLowerCase() === 'no'
        ) {

            const saved =
                saveSubbotConfig(
                    botJid,
                    {
                        prefix: ''
                    }
                )


            if (!saved) {

                return m.reply(
                    `${emoji} *ɴᴏ ꜱᴇ ᴘᴜᴅᴏ ɢᴜᴀʀᴅᴀʀ ᴇʟ ᴘʀᴇꜰɪᴊᴏ.*`
                )
            }


            return m.reply(
                `${emoji} ᴘʀᴇꜰɪᴊᴏ ᴅᴇʟ ᴊᴀᴅɪʙᴏᴛ: *sɪɴ ᴘʀᴇꜰɪᴊᴏ*`
            )
        }


        if (
            newPrefix.length > 3
        ) {

            return m.reply(
                `${emoji} *ᴇʟ ᴘʀᴇꜰɪᴊᴏ ɴᴏ ᴘᴜᴇᴅᴇ ᴛᴇɴᴇʀ ᴍᴀ́s ᴅᴇ 3 ᴄᴀʀᴀᴄᴛᴇʀᴇs.*`
            )
        }


        const saved =
            saveSubbotConfig(
                botJid,
                {
                    prefix: newPrefix
                }
            )


        if (!saved) {

            return m.reply(
                `${emoji} *ɴᴏ ꜱᴇ ᴘᴜᴅᴏ ɢᴜᴀʀᴅᴀʀ ᴇʟ ᴘʀᴇꜰɪᴊᴏ.*`
            )
        }

        return m.reply(
            `${emoji} ᴘʀᴇꜰɪᴊᴏ ᴄᴀᴍʙɪᴀᴅᴏ ᴀ: *${newPrefix}*`
        )
    }
}
