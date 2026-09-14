import sharp from 'sharp'
import { prepareWAMessageMedia } from '@itsliaaa/baileys'
import { getSubbotConfig } from '../../lib/subbotconfig.js'

const subbotStartTimes = new Map()

function getBotJid(conn) {
  return (
    conn.subBotJid ||
    conn.user?.jid ||
    conn.user?.id ||
    ''
  )
}

function formatUptime(startTime) {
  const elapsed = Date.now() - startTime

  const seconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const remainingHours = hours % 24
  const remainingMinutes = minutes % 60
  const remainingSeconds = seconds % 60

  const parts = []

  if (days > 0) {
    parts.push(`${days}d`)
  }

  if (remainingHours > 0) {
    parts.push(`${remainingHours}h`)
  }

  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes}m`)
  }

  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`)
  }

  return parts.join(' ')
}

export default {
  command: ['stat', 'Stat', 'config'],
  noPrefix: true,

  async run(m, { conn }) {
    const botJid = getBotJid(conn)

    if (!botJid) {
      return m.reply('*No se pudo identificar el Jadibot.*')
    }

    if (!subbotStartTimes.has(botJid)) {
      subbotStartTimes.set(botJid, Date.now())
    }

    const botConfig = getSubbotConfig(botJid)

    const botName =
      botConfig?.botName ||
      'jᥲdιbot'

    const prefix =
      botConfig?.prefix || 'Sin prefijo'

    const emoji =
      botConfig?.emoji ||
      '🍃'

    const selfMode =
      botConfig?.self === 'on'
        ? 'Privado'
        : 'Público'

    const startTime = subbotStartTimes.get(botJid)
    const uptime = formatUptime(startTime)

    const statText = `ᴇꜱᴛᴀᴅɪꜱᴛɪᴄᴀꜱ ᴅᴇʟ ᴊᴀᴅɪʙᴏᴛ

Nombre: *${botName}*
Prefijo: *${prefix}*
Emoji: *${emoji}*
Modo: *${selfMode}*
Tiempo: *${uptime}*
    `.trim()

    const previewUrl = 'https://tewianix.org'

    const previewImage =
      botConfig?.mediaUrl ||
      'https://files.catbox.moe/fhnqaa.jpg'

    let linkPreview

    try {
      const imageResponse = await fetch(previewImage)

      if (!imageResponse.ok) {
        throw new Error(`Error HTTP ${imageResponse.status}`)
      }

      const originalBuffer = Buffer.from(
        await imageResponse.arrayBuffer()
      )

      const thumbnailBuffer = await sharp(originalBuffer)
        .resize(1280, 720, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 90
        })
        .toBuffer()

      const { imageMessage } = await prepareWAMessageMedia(
        {
          image: thumbnailBuffer
        },
        {
          upload: conn.waUploadToServer,
          mediaTypeOverride: 'thumbnail-link'
        }
      )

      if (imageMessage) {
        imageMessage.width = 1280
        imageMessage.height = 720
      }

      linkPreview = {
        'canonical-url': previewUrl,
        'matched-text': previewUrl,
        title: botName,
        description: 'Estadisticas del Jadibot',
        previewType: 0,
        jpegThumbnail: thumbnailBuffer,
        highQualityThumbnail: imageMessage,
        linkPreviewMetadata: {
          linkMediaDuration: 0,
          socialMediaPostType: 4
        }
      }
    } catch (error) {
      console.error(
        '[STAT] Error generando link preview:',
        error
      )
    }

    if (linkPreview) {
      return await conn.sendMessage(
        m.chat,
        {
          text: `${previewUrl}\n\n${statText}`,
          linkPreview
        },
        {
          quoted: m
        }
      )
    }

    return m.reply(statText)
  }
}
