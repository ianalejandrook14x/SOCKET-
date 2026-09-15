import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import {
    downloadContentFromMessage
} from '@itsliaaa/baileys'
import {
    getSubbotConfig,
    saveSubbotConfig
} from '../../lib/subbotconfig.js'
import config from '../../config.js'

function decodeNumber(target) {
    if (!target) return ''

    return String(target)
        .split('@')[0]
        .split(':')[0]
        .replace(/[^0-9]/g, '')
}

function getBotJid(conn) {
    return (
        conn?.subBotJid ||
        conn?.user?.jid ||
        conn?.user?.id ||
        ''
    )
}

function isMainOwner(sender) {
    const senderNumber =
        decodeNumber(sender)

    if (!senderNumber) return false

    const owners =
        Array.isArray(config?.owners)
            ? config.owners
            : []

    return owners.some(owner => {
        const ownerNumber =
            decodeNumber(owner)

        return (
            ownerNumber &&
            ownerNumber === senderNumber
        )
    })
}

function isAllowedOwner(
    m,
    conn,
    botConfig,
    botJid
) {
    const sender =
        m?.key?.participantAlt ||
        m?.participantAlt ||
        m?.sender ||
        m?.key?.participant ||
        m?.key?.remoteJid ||
        ''

    const senderNumber =
        decodeNumber(sender)

    if (!senderNumber) {
        return false
    }

    if (isMainOwner(sender)) {
        return true
    }

    const botNumber =
        decodeNumber(botJid)

    const configuredOwner =
        decodeNumber(
            botConfig?.ownerNumber
        )

    const subbotOwner =
        decodeNumber(
            conn?.subbotOwner
        )

    if (
        configuredOwner &&
        configuredOwner === senderNumber
    ) {
        return true
    }

    if (
        subbotOwner &&
        subbotOwner === senderNumber
    ) {
        return true
    }

    if (
        botNumber &&
        botNumber === senderNumber
    ) {
        return true
    }

    return false
}

function getQuotedImage(m) {
    const quoted =
        m?.quoted

    if (!quoted) {
        return null
    }

    const message =
        quoted?.message ||
        quoted

    if (message?.imageMessage) {
        return message.imageMessage
    }

    return null
}

function getMimeType(media) {
    return (
        media?.mimetype ||
        media?.mimeType ||
        'image/jpeg'
    )
}

function getExtension(mimetype) {
    const type =
        String(mimetype)
            .toLowerCase()
            .split(';')[0]
            .trim()

    if (type === 'image/png') {
        return 'png'
    }

    if (type === 'image/webp') {
        return 'webp'
    }

    if (type === 'image/gif') {
        return 'gif'
    }

    if (type === 'image/bmp') {
        return 'bmp'
    }

    return 'jpg'
}

async function uploadToCatbox(
    buffer,
    mimetype
) {
    const extension =
        getExtension(mimetype)

    const tempFile =
        path.join(
            os.tmpdir(),
            `jadibot-${randomUUID()}.${extension}`
        )

    try {

        await fs.promises.writeFile(
            tempFile,
            buffer
        )

        const form =
            new FormData()

        form.append(
            'reqtype',
            'fileupload'
        )

        const blob =
            new Blob(
                [
                    buffer
                ],
                {
                    type:
                        mimetype ||
                        'image/jpeg'
                }
            )

        form.append(
            'fileToUpload',
            blob,
            `banner.${extension}`
        )

        const response =
            await fetch(
                'https://catbox.moe/user/api.php',
                {
                    method: 'POST',
                    body: form
                }
            )

        const result =
            await response.text()

        if (!response.ok) {
            throw new Error(
                `Catbox HTTP ${response.status}: ${result}`
            )
        }

        const url =
            String(result).trim()

        if (
            !url ||
            !/^https?:\/\/files\.catbox\.moe\//i.test(
                url
            )
        ) {
            throw new Error(
                `Respuesta inválida de Catbox: ${url}`
            )
        }

        return url

    } finally {

        try {
            await fs.promises.unlink(
                tempFile
            )
        } catch {}
    }
}

async function downloadWhatsAppImage(
    imageMessage
) {
    const stream =
        await downloadContentFromMessage(
            imageMessage,
            'image'
        )

    const chunks = []

    for await (
        const chunk of stream
    ) {
        chunks.push(
            Buffer.from(chunk)
        )
    }

    return Buffer.concat(
        chunks
    )
}

async function downloadImageFromUrl(
    url
) {
    let parsedUrl

    try {
        parsedUrl =
            new URL(url)
    } catch {
        throw new Error(
            'La URL proporcionada no es válida.'
        )
    }

    if (
        parsedUrl.protocol !== 'http:' &&
        parsedUrl.protocol !== 'https:'
    ) {
        throw new Error(
            'La URL debe utilizar HTTP o HTTPS.'
        )
    }

    const response =
        await fetch(
            parsedUrl.toString(),
            {
                method: 'GET'
            }
        )

    if (!response.ok) {
        throw new Error(
            `No se pudo descargar la imagen. HTTP ${response.status}.`
        )
    }

    const contentType =
        String(
            response.headers.get(
                'content-type'
            ) || ''
        )
            .toLowerCase()
            .split(';')[0]
            .trim()

    if (
        !contentType.startsWith(
            'image/'
        )
    ) {
        throw new Error(
            '*La URL proporcionada no contiene una imagen.*'
        )
    }

    const arrayBuffer =
        await response.arrayBuffer()

    const buffer =
        Buffer.from(arrayBuffer)

    if (!buffer.length) {
        throw new Error(
            'La imagen descargada está vacía.'
        )
    }

    return {
        buffer,
        mimetype:
            contentType
    }
}

export default {
    command: [
        'setbanner',
        'setimage'
    ],

    async run(
        m,
        {
            conn,
            args
        }
    ) {

        const botJid =
            getBotJid(conn)

        if (!botJid) {
            return
        }

        const botConfig =
            getSubbotConfig(
                botJid
            )

        const allowed =
            isAllowedOwner(
                m,
                conn,
                botConfig,
                botJid
            )

        if (!allowed) {
            return
        }

        const argumentos =
            Array.isArray(args)
                ? args
                : []

        const url =
            argumentos.length
                ? argumentos.join(' ').trim()
                : ''

        const quotedImage =
            getQuotedImage(m)

        if (
            !url &&
            !quotedImage
        ) {
            return m.reply(
                '*Responde a una imagen o una URL de una imagen.*'
            )
        }

        let imageBuffer
        let mimetype

        try {

            if (quotedImage) {

                imageBuffer =
                    await downloadWhatsAppImage(
                        quotedImage
                    )

                mimetype =
                    getMimeType(
                        quotedImage
                    )

            } else {

                const downloaded =
                    await downloadImageFromUrl(
                        url
                    )

                imageBuffer =
                    downloaded.buffer

                mimetype =
                    downloaded.mimetype
            }

            if (!imageBuffer?.length) {
                throw new Error(
                    'No se pudo obtener la imagen.'
                )
            }

            const catboxUrl =
                await uploadToCatbox(
                    imageBuffer,
                    mimetype
                )

            await saveSubbotConfig(
                botJid,
                {
                    mediaUrl:
                        catboxUrl,

                    mediaType:
                        'image'
                }
            )

            return m.reply(
                `*ɪᴍᴀɢᴇɴ ᴀᴄᴛᴜᴀʟɪᴢᴀᴅᴀ*\n\n${catboxUrl}`
            )

        } catch (error) {

            console.error(
                '[SETBANNER] Error:',
                error
            )

            return m.reply(
                '*No se pudo actualizar la imagen.*'
            )
        }
    }
}
