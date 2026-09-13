import { getSubbotConfig, saveSubbotConfig, validateSubbotOwner } from '../../lib/subbotconfig.js'

const CATBOX_URL = 'https://catbox.moe/user/api'

async function uploadToCatbox(buffer, filename = 'banner.jpg') {
    const form = new FormData()

    form.append('reqtype', 'fileupload')

    form.append(
        'fileToUpload',
        new Blob([buffer]),
        filename
    )

    const response = await fetch(
        CATBOX_URL,
        {
            method: 'POST',
            body: form
        }
    )

    if (!response.ok) {
        throw new Error(
            `Catbox respondió con HTTP ${response.status}`
        )
    }

    const result = (
        await response.text()
    ).trim()

    if (
        !result ||
        !result.startsWith('https://files.catbox.moe/')
    ) {
        throw new Error(
            `Respuesta inválida de Catbox: ${result}`
        )
    }

    return result
}

async function getImageFromQuotedMessage(m) {
    const quoted = m?.quoted

    if (!quoted) {
        return null
    }

    const message =
        quoted?.message ||
        quoted?.msg ||
        {}

    const imageMessage =
        message?.imageMessage ||
        (
            quoted?.mtype === 'imageMessage'
                ? message
                : null
        )

    if (!imageMessage) {
        return null
    }

    if (typeof quoted.download === 'function') {
        const buffer =
            await quoted.download()

        if (buffer) {
            return buffer
        }
    }

    return null
}

const handler = async (
    m,
    {
        conn,
        args
    }
) => {
    try {

        const botJid =
            conn?.subBotJid ||
            conn?.user?.jid ||
            conn?.user?.id ||
            ''

        if (!botJid) {
            return m.reply(
                '*No se pudo identificar el Jadibot.*'
            )
        }

        const allowed =
            await validateSubbotOwner(
                m,
                conn
            )

        if (!allowed) {
            return
        }

        const currentConfig =
            getSubbotConfig(
                botJid,
                {}
            )

        if (args.length > 0) {

            const url =
                args.join(' ').trim()

            if (
                !/^https?:\/\//i.test(url)
            ) {
                return m.reply(
                    '*La URL no es válida*'
                )
            }

            await saveSubbotConfig(
                botJid,
                {
                    ...currentConfig,
                    mediaUrl: url
                }
            )

            return m.reply(
                '*Banner actualizado correctamente.*\n\n' +
                `> ${url}`
            )
        }

        const imageBuffer =
            await getImageFromQuotedMessage(m)

        if (!imageBuffer) {
            return m.reply(
                '*Responde a una imagen o URL*'
            )
        }

        await m.reply(
            '*Subiendo imagen*'
        )


        const catboxUrl =
            await uploadToCatbox(
                imageBuffer,
                'jadibot-banner.jpg'
            )

        await saveSubbotConfig(
            botJid,
            {
                ...currentConfig,
                mediaUrl: catboxUrl
            }
        )

        return m.reply(
            '*Imagen del Jadbot actualizada.*'
        )

    } catch (error) {

        console.error(
            'Error en setbanner:',
            error
        )

        return m.reply(
            '*No se pudo actualizar el banner.*\n\n' +
            `> ${error.message || error}`
        )
    }
}

handler.command = ['setbanner', 'setimage', 'imagen']

export default handler
