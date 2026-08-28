import { getGroup } from './database.js'
import { getSubbotConfig } from './subbotconfig.js'
import config from '../config.js'

const PREVIEW_TITLE = 'sᥲtsυkι tᥲᥴhιbᥲᥒᥲ'
const PREVIEW_BODY = 'bყ ιᥲᥒᥲᥣᥱjᥲᥒdrook16x'
const PREVIEW_URL = 'https://ws.ianalejandrook15x.site'
const PREVIEW_IMAGE = 'https://files.catbox.moe/7y3cph.jpeg'

export async function processWelcome(conn, { id, participants, action }) {
    try {
        if (!id || !participants || !Array.isArray(participants)) return

        const groupData = getGroup(id)

        if (!groupData || !groupData.welcome) return

        const rawJid =
            conn?.user?.jid ||
            conn?.user?.id ||
            conn?.subBotJid ||
            ''

        const botData = getSubbotConfig(rawJid, config)

        const groupMetadata =
            await conn.groupMetadata(id).catch(() => ({}))

        const groupName =
            groupMetadata.subject || 'el Grupo'

        const memberCount =
            groupMetadata.participants?.length || 0

        let thumbnail = null

        try {
            const imageResponse = await fetch(PREVIEW_IMAGE)

            if (imageResponse.ok) {
                const imageBuffer =
                    await imageResponse.arrayBuffer()

                thumbnail = Buffer.from(imageBuffer)
            }
        } catch (error) {
            console.error(
                'Error al obtener la imagen del preview:',
                error
            )
        }

        for (const item of participants) {
            const rawParticipant =
                typeof item === 'string'
                    ? item
                    : item?.id ||
                      item?.phoneNumber ||
                      ''

            if (!rawParticipant) continue

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
                userPushName !== userJid.split('@')[0]
                    ? `@${userPushName}`
                    : `@${userJid.split('@')[0]}`

            const less =
                `Ahora somos *${memberCount}* miembros.`

            if (action === 'add') {
                const welcomeText =
                    `Hola *${username}*\n\n` +
                    `${less}\n\n` +
                    `Bienvenido/a al grupo *${groupName}*.`

                await conn.sendMessage(
                    id,
                    {
                        text: welcomeText,
                        mentions: [userJid],
                        contextInfo: {
                            externalAdReply: {
                                title: PREVIEW_TITLE,
                                body: PREVIEW_BODY,
                                mediaType: 1,
                                renderLargerThumbnail: true,
                                thumbnail: thumbnail,
                                sourceUrl: PREVIEW_URL,
                                showAdAttribution: false
                            }
                        }
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
                    `*Nos vemos* ${username}\n` +
                    `*Grupo:* ${groupName}\n` +
                    `*El total de usuario es de ${memberCount} miembros.*`

                await conn.sendMessage(
                    id,
                    {
                        text: byeText,
                        mentions: [userJid],
                        contextInfo: {
                            externalAdReply: {
                                title: PREVIEW_TITLE,
                                body: PREVIEW_BODY,
                                mediaType: 1,
                                renderLargerThumbnail: true,
                                thumbnail: thumbnail,
                                sourceUrl: PREVIEW_URL,
                                showAdAttribution: false
                            }
                        }
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
