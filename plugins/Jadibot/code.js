import fs from 'fs'
import path from 'path'
import { initializeSubBot } from '../../lib/subbots.js'

export default {
    command: [
        'jadibot',
        'code',
        'codigo',
        'código'
    ],

    async run(m, { args, conn }) {

        let numero = null

        const argumentos = args || []

        // Detectar -me
        const myNumber = argumentos.some(
            arg => String(arg).toLowerCase() === '-me'
        )

        if (myNumber) {

            const senderAlt =
                m.key?.participantAlt ||
                m.participantAlt ||
                null

            const sender =
                senderAlt ||
                m.sender ||
                m.key?.participant ||
                m.key?.remoteJid

            if (!sender) {
                return m.reply(
                    '*No se pudo obtener el número.*'
                )
            }

            numero = String(sender)
                .split('@')[0]
                .replace(/[^0-9]/g, '')

            if (!numero) {
                return m.reply(
                    '*No se pudo obtener el número.*'
                )
            }

        } else {

            numero = argumentos
                .join('')
                .replace(/[^0-9]/g, '')
        }

        if (!numero) {
            return m.reply(
                '\n\n*ɪɴɢʀᴇꜱᴀ ᴜɴ ɴᴜᴍᴇʀᴏ ᴅᴇ ᴛᴇʟᴇꜰᴏɴᴏ*\n> ᴏᴛʀᴏ | -ᴍᴇ\n'
            )
        }

        const jid = `${numero}@s.whatsapp.net`

        let mensajeSat

        try {
            mensajeSat = await m.reply(
                '*ꜱᴏʟɪᴄɪᴛᴀɴᴅᴏ ᴄᴏᴅɪɢᴏ.*'
            )
        } catch (e) {
            console.error('Error enviando mensaje inicial:', e)
        }

        try {

            const safeJid = String(jid)
                .replace(/[^a-zA-Z0-9_-]/g, '_')

            const subbotFolder = path.join(
                process.cwd(),
                'database',
                'subbots',
                safeJid
            )

            if (fs.existsSync(subbotFolder)) {
                try {
                    fs.rmSync(subbotFolder, {
                        recursive: true,
                        force: true
                    })
                } catch (e) {
                    console.error(
                        'Error limpiando carpeta vieja:',
                        e
                    )
                }
            }

            const result = await initializeSubBot(
                jid,
                {
                    generatePairingCode: true,
                    phoneNumber: numero,
                    subbotOwner: m.sender
                }
            )

            if (!result || !result.pairingCode) {

                const errorText =
                    '*ᥒo sᥱ ρυdo gᥱᥒᥱrᥲr ᥱᥣ ᥴodιgo, ιᥒtᥱᥒtᥲ dᥱ ᥒυᥱvo ᥱᥒ υᥒos sᥱgυᥒdos*'

                try {
                    if (mensajeSat?.edit) {
                        await mensajeSat.edit(errorText)
                    } else if (m.edit) {
                        await m.edit(errorText)
                    } else {
                        await m.reply(errorText)
                    }
                } catch (e) {
                    await m.reply(errorText)
                }

                return
            }

            const codigoText =
                `${result.pairingCode}`

            try {

                if (mensajeSat?.edit) {
                    await mensajeSat.edit(codigoText)

                } else if (typeof m.edit === 'function') {
                    await m.edit(codigoText)

                } else {
                    await m.reply(codigoText)
                }

            } catch (editError) {

                console.error(
                    'Error editando mensaje:',
                    editError
                )

                await m.reply(codigoText)
            }

        } catch (error) {

            console.error(
                'Error en code:',
                error
            )

            const errorText =
                '*Error al generar código.*'

            try {

                if (mensajeSat?.edit) {
                    await mensajeSat.edit(errorText)

                } else if (typeof m.edit === 'function') {
                    await m.edit(errorText)

                } else {
                    await m.reply(errorText)
                }

            } catch (e) {
                await m.reply(errorText)
            }
        }
    }
}
