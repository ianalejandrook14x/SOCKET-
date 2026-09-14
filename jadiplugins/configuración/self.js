import sharp from 'sharp'
import { prepareWAMessageMedia } from '@itsliaaa/baileys'
import {
  getSubbotConfig,
  saveSubbotConfig,
  validateSubbotOwner
} from '../../lib/subbotconfig.js'

export default {
  command: ['self'],

  async run(m, { conn, args, usedPrefix }) {
    const botJid =
      conn.subBotJid ||
      conn.user?.jid ||
      conn.user?.id ||
      ''

    const botConfig = getSubbotConfig(botJid)

    const validOwner = validateSubbotOwner(m, conn)

    if (!validOwner) return

    const currentSelf =
      botConfig?.self === 'on'
        ? 'on'
        : 'off'

    const option = args?.[0]?.toLowerCase()

    if (!option) {
      const selfText = `
         ꜱᴇʟꜰ ᴍᴏᴅᴏ  

        ᴇꜱᴛᴀᴅᴏ: *${currentSelf.toUpperCase()}*
   
        ${usedPrefix}ꜱᴇʟꜰ ᴏɴ     
        ${usedPrefix}ꜱᴇʟꜰ ᴏꜰꜰ
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
          title: 'ꜱᴇʟꜰ ᴍᴏᴅᴏ',
          description: `ᴇꜱᴛᴀᴅᴏ: ${currentSelf.toUpperCase()}`,
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
          '[SELF] Error generando link preview:',
          error
        )
      }

      if (linkPreview) {
        return await conn.sendMessage(
          m.chat,
          {
            text: `${previewUrl}\n\n${selfText}`,
            linkPreview
          },
          {
            quoted: m
          }
        )
      }

      return m.reply(selfText)
    }

    if (option === 'on') {
      await saveSubbotConfig(botJid, {
        self: 'on'
      })

      return m.reply(
        `*modo *sᥱᥣf* ᥲᥴtιvᥲdo*\n\nsᥱ ᥱstᥲbᥣᥱᥴιo ᥱᥣ modo ρrιvᥲdo.`
      )
    }

    if (option === 'off') {
      await saveSubbotConfig(botJid, {
        self: 'off'
      })

      return m.reply(
        `*modo sᥱᥣf dᥱsᥲᥴtιvᥲdo*\n\nᥱᥣ jᥲdιbot sᥱ ᥱstᥲbᥣᥱᥴιo ᥱᥒ modo ρúbᥣιᥴo.`
      )
    }

    return m.reply(
      `*oρᥴιoᥒᥱs dιsρoᥒιbᥣᥱs*\n\n${usedPrefix}sᥱᥣf oᥒ\n${usedPrefix}sᥱᥣf off`
    )
  }
}
