/*
•❅──────✧✦✧──────❅•
Codigo Creado Por CUERVO-TEAM-SUPREME
Para Elymas-Bot Este Codigo Es 
Exclusivo Y Unico Para Este Bot Al 
Clonar O Copiar Dejar Estos Creditos 
De Cuervo-Team-Supreme
━━━━━ ☾☽ ━━━━━
ʚĭɞ ೃ CODIGO JAVASCRIPT ʚĭɞ ೃ
ʚĭɞ ೃ codigo :: lib/welcome.js
ʚĭɞ ೃ funcion :: bienvenida/despedida con nombre personalizado/mención (@usuario)
ʚĭɞ ೃ estado :: completo
──────✧✦✧──────
*/

import { getGroup } from './database.js'
import { getSubbotConfig } from './subbotconfig.js'
import config from '../config.js'

const STELLAR_KEY = 'api-COTah'
const EVO_KEY = 'evogb-WzR3kPpa'

const DEFAULT_AVATAR = 'https://nube.stellarwa.xyz/rf/HLC2aJy3eCRP.jpeg'
const DEFAULT_BG = 'https://nube.stellarwa.xyz/rf/HLC2aJy3eCRP.jpeg'

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
            const rawParticipant = typeof item === 'string' ? item : item?.id || item?.phoneNumber || ''
            if (!rawParticipant) continue

            const userJid = rawParticipant.includes('@') ? rawParticipant : `${rawParticipant}@s.whatsapp.net`
            
            let userPushName = ''
            try {
                userPushName = conn.getName ? await conn.getName(userJid) : ''
            } catch {
                userPushName = ''
            }

            const username = userPushName && userPushName !== userJid.split('@')[0] 
                ? `@${userPushName}` 
                : `@${userJid.split('@')[0]}`

            let userAvatar = DEFAULT_AVATAR
            try {
                userAvatar = await conn.profilePictureUrl(userJid, 'image')
            } catch {
                userAvatar = DEFAULT_AVATAR
            }

            const customMsg = `Hola soy ${botName}, mi dueño es ${ownerName}`
            
            const queryParams = new URLSearchParams({
                method: 'url',
                url: userAvatar,
                username: username, // Ahora lleva la mención o nombre (@Cuervo / @123456)
                servername: groupName,
                memberCount: memberCount.toString(),
                theme: 'tech',
                textColor: '#ffffff',
                borderColor: '#3498db',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                avatarBorderColor: '#3498db',
                message: customMsg,
                background: groupIcon
            })

            if (action === 'add') {
                const welcomeText = `👋 *¡Bienvenido/a ${username}!*\n\n${customMsg}\nEsperamos que disfrutes tu estadía en *${groupName}*.`

                let imageUrl = ''
                
                try {
                    const stellarUrl = `https://api.stellarwa.xyz/generate/welcome-card?${queryParams.toString()}&key=${STELLAR_KEY}`
                    
                    const checkRes = await fetch(stellarUrl, { method: 'HEAD' })
                    if (checkRes.ok) {
                        imageUrl = stellarUrl
                    } else {
                        throw new Error('StellarWA no disponible')
                    }
                } catch (err) {
                    imageUrl = `https://api.evogb.org/generate/welcome-card?${queryParams.toString()}&key=${EVO_KEY}`
                }

                await conn.sendMessage(id, {
                    image: { url: imageUrl },
                    caption: welcomeText,
                    mentions: [userJid]
                }).catch(err => console.error('❌ Error enviando tarjeta de bienvenida:', err))
            }

            if (action === 'remove') {
                const byeText = `👋 *¡Hasta luego ${username}!*\n\nUn miembro menos en *${groupName}*. Quedamos ${memberCount} miembros.`

                let imageUrl = ''

                try {
                    const stellarUrl = `https://api.stellarwa.xyz/generate/bye-image?username=${encodeURIComponent(username)}&guildName=${encodeURIComponent(groupName)}&guildIcon=${encodeURIComponent(groupIcon)}&memberCount=${memberCount}&avatar=${encodeURIComponent(userAvatar)}&background=${encodeURIComponent(groupIcon)}&key=${STELLAR_KEY}`
                    
                    const checkRes = await fetch(stellarUrl, { method: 'HEAD' })
                    if (checkRes.ok) {
                        imageUrl = stellarUrl
                    } else {
                        throw new Error('StellarWA Bye no disponible')
                    }
                } catch (err) {
                    imageUrl = `https://api.evogb.org/generate/bye-image?username=${encodeURIComponent(username)}&memberCount=${memberCount}&guildName=${encodeURIComponent(groupName)}&guildIcon=${encodeURIComponent(groupIcon)}&avatar=${encodeURIComponent(userAvatar)}&background=${encodeURIComponent(groupIcon)}&key=${EVO_KEY}`
                }

                await conn.sendMessage(id, {
                    image: { url: imageUrl },
                    caption: byeText,
                    mentions: [userJid]
                }).catch(err => console.error('❌ Error enviando tarjeta de despedida:', err))
            }
        }
    } catch (error) {
        console.error('❌ Error en lib/welcome.js:', error)
    }
}
