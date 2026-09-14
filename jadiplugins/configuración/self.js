import {
    getSubbotConfig,
    saveSubbotConfig,
    validateSubbotOwner
} from '../../lib/subbotconfig.js'


export default {

    command: [
        'self'
    ],


    async run(
        m,
        {
            conn,
            args = [],
            usedPrefix = ''
        }
    ) {

        const permission =
            validateSubbotOwner(
                m,
                conn
            )


        if (
            !permission?.allowed
        ) {

            return m.reply(
                '*Solo el dueño del Jadibot puede acceder a esta configuración*'
            )
        }


        const botJid =
            conn?.subBotJid ||
            conn?.user?.jid ||
            conn?.user?.id ||
            ''


        if (!botJid) {

            return m.reply(
                '*No se pudo identificar la sesión del Jadibot*'
            )
        }


        const botConfig =
            getSubbotConfig(
                botJid
            )


        const currentSelf =
            String(
                botConfig?.self ||
                'off'
            )
                .trim()
                .toLowerCase()


        const previewUrl =
            String(
                botConfig?.mediaUrl ||
                ''
            )
                .trim()


        if (
            !args.length
        ) {

            const selfText =
                `       ꜱᴇʟꜰ ᴍᴏᴅᴏ  

      ᴇꜱᴛᴀᴅᴏ: *${currentSelf.toUpperCase()}*
 
      ${usedPrefix}ꜱᴇʟꜰ ᴏɴ     
      ${usedPrefix}ꜱᴇʟꜰ ᴏꜰꜰ`


            if (
                previewUrl
            ) {

                return conn.sendMessage(
                    m.chat,
                    {
                        text:
                            `${previewUrl}\n\n${selfText}`,
                        contextInfo: {
                            externalAdReply: {
                                title: 'ꜱᴇʟꜰ ᴍᴏᴅᴏ',
                                body: `ᴇꜱᴛᴀᴅᴏ: ${currentSelf.toUpperCase()}`,
                                mediaType: 1,
                                renderLargerThumbnail: true,
                                showAdAttribution: false,
                                sourceUrl: previewUrl,
                                thumbnailUrl: previewUrl
                            }
                        }
                    },
                    {
                        quoted: m
                    }
                )
            }


            return m.reply(
                selfText
            )
        }


        const action =
            String(
                args[0]
            )
                .trim()
                .toLowerCase()


        if (
            action === 'on'
        ) {

            if (
                currentSelf === 'on'
            ) {

                return m.reply(
                    '*ᥱᥣ modo sᥱᥣf ყᥲ sᥱ ᥱᥒᥴυᥱᥒtrᥲ ᥲᥴtιvᥲdo*'
                )
            }


            const saved =
                saveSubbotConfig(
                    botJid,
                    {
                        self: 'on'
                    }
                )


            if (!saved) {

                return m.reply(
                    'ᥒo sᥱ ρυdo gυᥲrdᥲr ᥱᥣ modo sᥱᥣf'
                )
            }


            return m.reply(

                `       *ꜱᴇʟꜰ ᴀᴄᴛɪᴠᴏ*       

` +
                `ꜱᴇ ᴇꜱᴛᴀʙʟᴇᴄɪᴏ ᴇʟ ᴍᴏᴅᴏ ᴘʀɪᴠᴀᴅᴏ.`

            )
        }


        if (
            action === 'off'
        ) {

            if (
                currentSelf === 'off'
            ) {

                return m.reply(
                    '*ᥱᥣ modo sᥱᥣf ყᥲ sᥱ ᥱᥒᥴυᥱᥒtrᥲ dᥱsᥲᥴtιvᥲdo*'
                )
            }


            const saved =
                saveSubbotConfig(
                    botJid,
                    {
                        self: 'off'
                    }
                )


            if (!saved) {

                return m.reply(
                    'oᥴυrrιó υᥒ ᥱrror ᥲᥣ dᥱsᥲᥴtιvᥲr ᥱᥣ sᥱᥣf'
                )
            }


            return m.reply(

                `       *ꜱᴇʟꜰ ᴅᴇꜱᴀᴄᴛɪᴠᴀᴅᴏ*       

` +
                `ꜱᴇ ᴅᴇꜱᴀᴄᴛɪᴠᴏ ᴇʟ ᴍᴏᴅᴏ ᴘʀɪᴠᴀᴅᴏ`

            )
        }


        return m.reply(

            `     oρᥴιóᥒ ιᥒvᥲᥣιdᥲ     

` +
            `ᴜꜱᴏ ᴄᴏʀʀᴇᴄᴛᴏ:

` +
            `> ${usedPrefix}ꜱᴇʟꜰ ᴏɴ
` +
            `> ${usedPrefix}ꜱᴇʟꜰ ᴏꜰꜰ`

        )
    }
}
