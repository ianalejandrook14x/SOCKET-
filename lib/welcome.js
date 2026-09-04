import { getGroup } from './database.js'
import { getSubbotConfig } from './subbotconfig.js'
import config from '../config.js'
import { prepareWAMessageMedia } from '@itsliaaa/baileys'
import sharp from 'sharp'

const PREVIEW_TITLE = 'sᥲtsυkι tᥲᥴhιbᥲᥒᥲ'
const PREVIEW_BODY = 'bყ ιᥲᥒᥲᥣᥱjᥲᥒdrook16x'
const PREVIEW_URL = 'https://tewianix.org'
const PREVIEW_IMAGE = 'https://files.catbox.moe/7y3cph.jpeg'

async function createLinkPreview(conn) {
    try {
        const imageResponse = await fetch(PREVIEW_IMAGE)

        if (!imageResponse.ok) {
            throw new Error(
                `No se pudo obtener la imagen: ${imageResponse.status}`
            )
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

        const { imageMessage } =
            await prepareWAMessageMedia(
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

        return {
            'canonical-url': PREVIEW_URL,
            'matched-text': PREVIEW_URL,
            title: PREVIEW_TITLE,
            description: PREVIEW_BODY,
            previewType: 0,
            jpegThumbnail: thumbnailBuffer,
            highQualityThumbnail: imageMessage || undefined,
            linkPreviewMetadata: {
                linkMediaDuration: 0,
                socialMediaPostType: 4
            }
        }
    } catch (error) {
        console.error(
            'Error al generar la vista previa:',
            error
        )

        return {
            'canonical-url': PREVIEW_URL,
            'matched-text': PREVIEW_URL,
            title: PREVIEW_TITLE,
            description: PREVIEW_BODY,
            previewType: 0,
            linkPreviewMetadata: {
                linkMediaDuration: 0,
                socialMediaPostType: 4
            }
        }
    }
}

export async function processWelcome(
    conn,
    { id, participants, action }
) {
    try {
        if (
            !id ||
            !participants ||
            !Array.isArray(participants)
        ) {
            return
        }

        const groupData = getGroup(id)

        if (!groupData || !groupData.welcome) {
            return
        }

        const rawJid =
            conn?.user?.jid ||
            conn?.user?.id ||
            conn?.subBotJid ||
            ''

        const botData =
            getSubbotConfig(rawJid, config)

        const groupMetadata =
            await conn
                .groupMetadata(id)
                .catch(() => ({}))

        const groupName =
            groupMetadata.subject ||
            'el Grupo'

        const memberCount =
            groupMetadata.participants?.length ||
            0

        for (const item of participants) {
            const rawParticipant =
                typeof item === 'string'
                    ? item
                    : item?.id ||
                      item?.phoneNumber ||
                      ''

            if (!rawParticipant) {
                continue
            }

            const userJid =
                rawParticipant.includes('@')
                    ? rawParticipant
                    : `${rawParticipant}@s.whatsapp.net`

            let userPushName = ''

            try {
                userPushName = conn.getName
                    ? await conn.getName(userJid)
                    : ''
            } catch {
                userPushName = ''
            }

            const username =
                userPushName &&
                userPushName !==
                    userJid.split('@')[0]
                    ? `@${userPushName}`
                    : `@${userJid.split('@')[0]}`

            const less =
                `Ahora somos *${memberCount}* miembros.`

            const linkPreview =
                await createLinkPreview(conn)

            if (action === 'add') {
                const welcomeText =
                    `${PREVIEW_URL}\n\n` +
                    `Hola *${username}*\n\n` +
                    `${less}\n\n` +
                    `Bienvenido/a al grupo *${groupName}*.`

                await conn.sendMessage(
                    id,
                    {
                        text: welcomeText,
                        mentions: [userJid],
                        linkPreview
                    }
                ).catch(err =>
                    console.error(
                        'Error al enviar bienvenida:',
                        err
                    )
                )
            }

            if (action === 'remove') {
                const byeText =
                    `${PREVIEW_URL}\n\n` +
                    `*Nos vemos* ${username}\n` +
                    `*Grupo:* ${groupName}\n` +
                    `*El total de usuario es de ${memberCount} miembros.*`

                await conn.sendMessage(
                    id,
                    {
                        text: byeText,
                        mentions: [userJid],
                        linkPreview
                    }
                ).catch(err =>
                    console.error(
                        'Error al enviar despedida:',
                        err
                    )
                )
            }
        }
    } catch (error) {
        console.error(
            'Error en la libreria:',
            error
        )
    }
}
