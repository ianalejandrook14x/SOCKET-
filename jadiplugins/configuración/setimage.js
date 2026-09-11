import {
    downloadContentFromMessage
} from '@itsliaaa/baileys'

import {
    getSubbotConfig,
    saveSubbotConfig,
    validateSubbotOwner
} from '../../lib/subbotconfig.js'

const DEFAULT_IMAGE =
    'https://files.catbox.moe/fhnqaa.jpg'

async function streamToBuffer(stream) {
    const chunks = []

    for await (const chunk of stream) {
        chunks.push(chunk)
    }

    return Buffer.concat(chunks)
}

function getQuotedImage(m) {

    const quoted = m?.quoted

    if (!quoted) {
        return null
    }

    const message =
        quoted.message ||
        quoted.msg ||
        quoted

    if (message?.imageMessage) {
        return message.imageMessage
    }

    if (
        message?.viewOnceMessage?.message?.imageMessage
    ) {
        return (
            message
                .viewOnceMessage
                .message
                .imageMessage
        )
    }

    if (
        message?.viewOnceMessageV2?.message?.imageMessage
    ) {
        return (
            message
                .viewOnceMessageV2
                .message
                .imageMessage
        )
    }

    return null
}

async function downloadQuotedImage(m) {

    const imageMessage =
        getQuotedImage(m)

    if (!imageMessage) {
        return null
    }

    const stream =
        await downloadContentFromMessage(
            imageMessage,
            'image'
        )

    return await streamToBuffer(stream)
}


async function downloadImageFromUrl(url) {

    const response = await fetch(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
        }
    })

    if (!response.ok) {
        throw new Error(
            `No se pudo descargar la imagen. HTTP ${response.status}`
        )
    }

    const contentType =
        response.headers.get('content-type') || ''

    if (!contentType.startsWith('image/')) {
        throw new Error(
            'La URL no corresponde a una imagen.'
        )
    }

    return Buffer.from(
        await response.arrayBuffer()
    )
}

async function uploadToCatbox(
    buffer,
    filename = 'image.jpg'
) {

    const form = new FormData()

    form.append(
        'reqtype',
        'fileupload'
    )

    form.append(
        'fileToUpload',
        new Blob([buffer]),
        filename
    )

    const response = await fetch(
        'https://catbox.moe/user/api.php',
        {
            method: 'POST',
            body: form,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
            }
        }
    )

    if (!response.ok) {
        throw new Error(
            `Catbox - HTTP ${response.status}`
        )
    }

    const result =
        (await response.text()).trim()

    if (
        !result ||
        !result.startsWith(
            'https://files.catbox.moe/'
        )
    ) {
        throw new Error(
            `Catbox no devolvió una URL válida: ${result}`
        )
    }

    return result
}


export default {

    command: ['setimage'],

    async run(m, { conn, args = [] }) {

        const validation =
            validateSubbotOwner(m, conn)

        if (!validation.allowed) {
            return m.reply(
                validation.reason
            )
        }

        if (!conn.isSubBot) {
            return m.reply(
                '*Este comando solo funciona en una sesión Jadibot.*'
            )
        }

        let imageBuffer = null

        try {

            if (args.length > 0) {

                const url =
                    args.join(' ').trim()

                if (
                    !/^https?:\/\/\S+$/i.test(url)
                ) {
                    return m.reply(
                        '*La URL proporcionada no es válida.*'
                    )
                }

                await m.react?.('🕗')

                imageBuffer =
                    await downloadImageFromUrl(
                        url
                    )

            }

            else {

                const quotedImage =
                    getQuotedImage(m)

                if (!quotedImage) {
                    return m.reply(
                        '*Responde a una imagen o url*\n\n'
                    )
                }

                await m.react?.('🕗')

                imageBuffer =
                    await downloadQuotedImage(m)
            }

            if (
                !imageBuffer ||
                !Buffer.isBuffer(imageBuffer) ||
                imageBuffer.length === 0
            ) {
                throw new Error(
                    'No se pudo obtener la imagen.'
                )
            }

            const catboxUrl =
                await uploadToCatbox(
                    imageBuffer,
                    'jadibot-image.jpg'
                )

            const currentConfig =
                getSubbotConfig(
                    conn.subBotJid
                )

            saveSubbotConfig(
                conn.subBotJid,
                {
                    mediaUrl: catboxUrl,
                    mediaType: 'image',

                    name:
                        currentConfig?.name ||
                        'sᥲtsυkι tᥲᥴhιbᥲᥒᥲ',

                    ownerName:
                        currentConfig?.ownerName ||
                        'tᥱwιᥲᥒιx',

                    ownerNumber:
                        currentConfig?.ownerNumber ||
                        null
                }
            )

            await m.react?.('✅')

            return m.reply(
                '*Imagen del Jadibot actualizada.*\n\n'
            )

        } catch (error) {

            console.error(
                '[SETIMAGE] Error:',
                error
            )

            await m.react?.('❌')

            return m.reply(
                '*No se pudo actualizar la imagen.*\n\n' +
                `> ${error?.message || 'Error desconocido'}`
            )
        }
    }
}
