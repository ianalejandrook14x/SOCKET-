import fs from 'fs'
import path from 'path'
import config from '../../config.js'

function extractPureNumber(target) {
    if (!target) return ''
    return String(target).split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
}

export default {
    command: ['jadibot-del'],

    async run(m, { conn, text, args }) {
        const senderJid = m?.sender || m?.key?.participant || m?.key?.remoteJid || ''
        const senderNum = extractPureNumber(senderJid)

        const isMainOwner = Array.isArray(config?.owners) && config.owners.some(
            owner => extractPureNumber(owner) === senderNum
        )

        if (!isMainOwner) {
            return m.reply('*Solo el creador puede ejecutar este comando*')
        }

        let targetNumber = ''

        if (m.quoted && m.quoted.sender) {
            targetNumber = extractPureNumber(m.quoted.sender)
        } else if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetNumber = extractPureNumber(m.mentionedJid[0])
        } else if (text) {
            targetNumber = extractPureNumber(text)
        }

        if (!targetNumber || targetNumber.length < 10) {
            return m.reply(
                'Comando: [ jadibot-del ] | @mención - número*'
            )
        }

        const botFolder = path.join(config.subbots.folder || './database/subbots', targetNumber)
        const configFile = './database/subbots_config.json'

        let report = `*Jadibot Eliminado (${targetNumber})*\n\n`

        try {
            
            if (fs.existsSync(botFolder)) {
                fs.rmSync(botFolder, { recursive: true, force: true })
                report += '*Archivos limpiados.*\n'
            } else {
                report += '*No se encontró registro de carpetas para este usuario.*\n'
            }

            if (fs.existsSync(configFile)) {
                const subbotsConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
                
                if (subbotsConfig[targetNumber]) {
                    delete subbotsConfig[targetNumber]
                    fs.writeFileSync(configFile, JSON.stringify(subbotsConfig, null, 2))
                    report += 'Configuración personalizada eliminada.\n'
                } else {
                    report += 'Sin personalización en `subbots_config.json`.\n'
                }
            }

            report += '\n*Sesión eliminada.*'
            return m.reply(report)

        } catch (error) {
            console.error('Error al eliminar subbot:', error)
            return m.reply(`Error deleting:\n\`\`\`${error.message}\`\`\``)
        }
    }
}
