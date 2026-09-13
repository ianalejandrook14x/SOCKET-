import {
    getSubbotConfig,
    saveSubbotConfig,
    validateSubbotOwner
} from '../../lib/subbotconfig.js'

const CATBOX_URL = 'https://catbox.moe/user/api'

async function uploadToCatbox(buffer, filename = 'banner.jpg') {
    const form = new FormData()

    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', new Blob([buffer]), filename)

    const response = await fetch(CATBOX_URL, {
        method: 'POST',
        body: form
    })

    const result = (await response.text()).trim()

    if (!response.ok) {
        throw new Error(`Catbox respondió con HTTP ${response.status}: ${result}`)
    }

    if (!result || !result.startsWith('https://files.catbox.moe/')) {
        throw new Error(`Catbox devolvió una respuesta inválida: ${result}`)
    }

    return result
}

async function getQuotedImage(m) {
    const quoted = m?.quoted

    if (!quoted) {
        return null
    }

    const type = quoted?.mtype || quoted?.type || quoted?.message?.imageMessage ? 'imageMessage' : ''

    if (quoted?.mtype && quoted.mtype !== 'imageMessage') {
        return null
    }

    if (typeof quoted.download !== 'function') {
        return null
    }

    const buffer = await quoted.download()

    if (!buffer) {
        return null
    }

    return buffer
}

const handler = async (m, { conn, args }) => {
    try {
        const botJid = conn?.subBotJid || conn?.user?.jid || conn?.user?.id || ''

        if (!botJid) {
            return m.reply('*No se pudo identificar el Jadibot.*')
        }

        const allowed = await validateSubbotOwner(m, conn)

        if (!allowed) {
            return
        }

        const currentConfig = getSubbotConfig(botJid, {})

        if (args?.length) {
            const url = args.join(' ').trim()

            if (!/^https?:\/\//i.test(url)) {
                return m.reply(
                    'Url no invalida w'
                )
            }

            await saveSubbotConfig(botJid, {
                ...currentConfig,
                mediaUrl: url
            })

            return m.reply('*Banner actualizado correctamente.*')
        }

        const imageBuffer = await getQuotedImage(m)

        if (!imageBuffer) {
            return m.reply(
                'Responde a una imagen w'
            )
        }

        const catboxUrl = await uploadToCatbox(imageBuffer, 'jadibot-banner.jpg')

        await saveSubbotConfig(botJid, {
            ...currentConfig,
            mediaUrl: catboxUrl
        })

        return m.reply('*Banner actualizado correctamente.*')

    } catch (error) {
        console.error('[SETBANNER]', error)

        return m.reply(
            '*No se pudo actualizar el banner.*\n\n' +
            `> ${error?.message || error}`
        )
    }
}
handler.command = ['setbanner', 'setimage', 'imagen']

export default handler
