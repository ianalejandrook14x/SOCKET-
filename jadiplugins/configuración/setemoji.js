import config from '../../config.js'
import {
    getSubbotConfig,
    saveSubbotConfig
} from '../../lib/subbotconfig.js'

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
    return (config?.owners || [])
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
        'setemoji',
        'setemote',
        'emoji'
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

        if (!botJid) return

        const botNumber =
            cleanNumber(botJid)

        if (!botNumber) return

        const subbotConfig =
            getSubbotConfig(botNumber)

        const senderNumber =
            getSenderNumber(m)

        if (!senderNumber) return

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
            return
        }

        if (!text?.trim()) {
            return m.reply(
                `ᴇᴍᴏᴊɪ ᴀᴄᴛᴜᴀʟ: ${subbotConfig?.emoji || '🍃'}`
            )
        }

        const newEmoji =
            text.trim()

        if (newEmoji.length > 10) {
            return m.reply(
                '*ᴜsᴀ ᴜɴ ᴇᴍᴏᴊɪ ᴠᴀ́ʟɪᴅᴏ.*'
            )
        }

        saveSubbotConfig(
            botNumber,
            {
                emoji: newEmoji
            }
        )

        return m.reply(
            `ᴇᴍᴏᴊɪ ᴄᴀᴍʙɪᴀᴅᴏ ᴀ: ${newEmoji}`
        )
    }
}
