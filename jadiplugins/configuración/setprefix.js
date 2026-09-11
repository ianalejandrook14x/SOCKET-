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

function getMainOwners(config) {
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
        'setprefix',
        'setprefijo',
        'prefijo'
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
            getMainOwners(
                await import('../../config.js')
                    .then(module => module.default)
            )

        const isSubbotOwner =
            ownerNumber &&
            senderNumber === ownerNumber

        const isMainOwner =
            mainOwners.includes(senderNumber)

        if (!isSubbotOwner && !isMainOwner) {
            return
        }

        if (text === undefined || text === null) {
            return m.reply(
                `ᴘʀᴇꜰɪᴊᴏ ᴀᴄᴛᴜᴀʟ: *${subbotConfig.prefix || 'sin prefijo'}*`
            )
        }

        const newPrefix =
            text.trim()

        if (
            newPrefix.toLowerCase() === '' ||
            newPrefix.toLowerCase() === ' ' ||
            newPrefix.toLowerCase() === 'noprefix' ||
            newPrefix.toLowerCase() === 'sinprefijo'
        ) {

            saveSubbotConfig(
                botNumber,
                {
                    prefix: ''
                }
            )

            return m.reply(
                'ᴘʀᴇꜰɪᴊᴏ ᴅᴇʟ ᴊᴀᴅɪʙᴏᴛ: *sɪɴ ᴘʀᴇꜰɪᴊᴏ*'
            )
        }

        if (newPrefix.length > 3) {
            return m.reply(
                '*ᴇʟ ᴘʀᴇꜰɪᴊᴏ ɴᴏ ᴘᴜᴇᴅᴇ ᴛᴇɴᴇʀ ᴍᴀ́s ᴅᴇ 3 ᴄᴀʀᴀᴄᴛᴇʀᴇs.*'
            )
        }

        saveSubbotConfig(
            botNumber,
            {
                prefix: newPrefix
            }
        )

        return m.reply(
            `ᴘʀᴇꜰɪᴊᴏ ᴄᴀᴍʙɪᴀᴅᴏ ᴀ: *${newPrefix}*`
        )
    }
}
