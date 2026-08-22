import { getGroup } from './database.js'
import { getSubbotConfig } from './subbotconfig.js'
import config from '../config.js'

const DEFAULT_AVATAR = 'https://files.catbox.moe/fhnqaa.jpg'
const DEFAULT_BG = 'https://files.catbox.moe/fhnqaa.jpg'

export async function processWelcome(conn, { id, participants, action }) {
    try {
        if (!id || !participants || !Array.isArray(participants)) return

        const groupData = getGroup(id)
        if (!groupData || !groupData.welcome) return

        const rawJid = conn?.user?.jid || conn?.user?.id || conn?.subBotJid || ''
        const botData = getSubbotConfig(rawJid, config)

        const botName = botData.name || config.botName || 'Cuervo'
        const ownerName = botData.ownerName || config.ownerName || 'TheDevil'

        const groupMetadata = await conn.groupMetadata(id).catch(() => ({}))
        const groupName = groupMetadata.subject || 'el Grupo'
        const memberCount = groupMetadata.participants?.length || 0

        let groupIcon = DEFAULT_BG

        try {
            groupIcon = await conn.profilePictureUrl(id, 'image')
        } catch {
            groupIcon = DEFAULT_BG
        }

        for (const item of participants) {
            const rawParticipant =
                typeof item === 'string'
                    ? item
                    : item?.id || item?.phoneNumber || ''

            if (!rawParticipant) continue

            const userJid = rawParticipant.includes('@')
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
                userPushName && userPushName !== userJid.split('@')[0]
                    ? `@${userPushName}`
                    : `@${userJid.split('@')[0]}`

            let userAvatar = DEFAULT_AVATAR

            try {
                userAvatar = await conn.profilePictureUrl(userJid, 'image')
            } catch {
                userAvatar = DEFAULT_AVATAR
            }

            const customMsg =
                `Soy el bot ${botname}`

            if (action === 'add') {
                const welcomeText =
                    `*Hola ${username}*\n` +
                    `*${customMsg}*\n` +
                    `*Bienvenido/a al grupo ${groupName}*.`

                const imageUrl = userAvatar

                await conn.sendMessage(id, {
                    image: { url: imageUrl },
                    caption: welcomeText,
                    mentions: [userJid]
                }).catch(err =>
                    console.error(
                        'Error al enviar imagen de bienvenida:',
                        err
                    )
                )
            }

            if (action === 'remove') {
                const byeText =
                    `*Nos vemos ${username}\n` +
                    `*Nombre del grupo: ${groupName}\n` +
                    `*El total de usuario es de ${memberCount} miembros.*`

                const imageUrl = userAvatar

                await conn.sendMessage(id, {
                    image: { url: imageUrl },
                    caption: byeText,
                    mentions: [userJid]
                }).catch(err =>
                    console.error(
                        'Error al enviar la imagen de despedida:',
                        err
                    )
                )
            }
        }
    } catch (error) {
        console.error('Error en la libreria:', error)
    }
}
