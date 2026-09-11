import {
    saveSubbotConfig,
    getSubbotConfig
} from '../../lib/subbotconfig.js'
import config from '../../config.js'

function cleanNumber(value) {
    if (!value) return ''

    return String(value)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '')
}

function getSenderNumber(m) {
    return cleanNumber(
        m?.sender ||
        m?.participant ||
        ''
    )
}

function getMainOwners() {
    const owners = config?.owners || []

    return owners
        .map(owner => {
            if (Array.isArray(owner)) {
                return cleanNumber(owner[0])
            }

            return cleanNumber(owner)
        })
        .filter(Boolean)
}

export default {

    command: [
        'setname',
        'setnamebot',
        'setbotname',
        'jadi-name'
    ],

    async run(m, { conn, text }) {

        if (!conn?.isSubBot && !conn?.isSubbot) {
            return
        }

        const botJid =
            conn?.subBotJid ||
            conn?.user?.jid ||
            conn?.user?.id ||
            ''

        if (!botJid) {
            console.error(
                '[SETNAME] No se pudo identificar el Jadibot.'
            )

            return
        }

        const botNumber = cleanNumber(botJid)

        if (!botNumber) {
            console.error(
                '[SETNAME] No se pudo obtener el número del Jadibot.'
            )

            return
        }

        const subbotConfig =
            getSubbotConfig(botNumber)
        
        const senderNumber =
            getSenderNumber(m)

        if (!senderNumber) {
            console.error(
                '[SETNAME] No se pudo identificar al usuario.'
            )

            return
        }

        const ownerNumber =
            cleanNumber(
                subbotConfig?.ownerNumber
            )

        const mainOwners =
            getMainOwners()

        const isSubbotOwner =
            ownerNumber &&
            senderNumber === ownerNumber

        const isMainOwner =
            mainOwners.includes(senderNumber)

        if (!isSubbotOwner && !isMainOwner) {
            console.log(
                `[SETNAME] FLS ` +
                `Jadibot: ${botNumber} | ` +
                `Sender: ${senderNumber} | ` +
                `Owner: ${ownerNumber || 'NO CONFIGURADO'}`
            )

            return
        }

        if (!text?.trim()) {
            return m.reply(
                '*ɪɴɢʀᴇꜱᴀ ᴇʟ ɴᴏᴍʙʀᴇ ᴘᴀʀᴀ ᴇʟ ᴊᴀᴅɪʙᴏᴛ*'
            )
        }

        const newName =
            text.trim()

        if (newName.length > 20) {
            return m.reply(
                '*ᴇʟ ɴᴏᴍʙʀᴇ ɴᴏ ᴘᴜᴇᴅᴇ ᴛᴇɴᴇʀ ᴍᴀ́s ᴅᴇ 20 ᴄᴀʀᴀᴄᴛᴇʀᴇs.*'
            )
        }

        saveSubbotConfig(botNumber, {
            name: newName
        })

        return m.reply(
            `ɴᴏᴍʙʀᴇ ᴄᴀᴍʙɪᴀᴅᴏ ᴀ: *${newName}*`
        )
    }
}
