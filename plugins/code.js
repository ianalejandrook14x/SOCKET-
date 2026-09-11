import fs from 'fs'
import path from 'path'
import { initializeSubBot } from '../../lib/subbots.js'

export default {
    command: [
        'jadibot',
        'code',
        'codigo',
        'código'
    ],

    async run(m, { args }) {

        const numero = args
            ?.join('')
            ?.replace(/[^0-9]/g, '')

        if (!numero) {
            return m.reply(
                '*Ingresa el número de telefono.*\n\n'
            )
        }

        const jid = `${numero}@s.whatsapp.net`

        await m.reply(
            '*Solicitando código.*'
        )

        try {
            const safeJid = String(jid).replace(/[^a-zA-Z0-9_-]/g, '_')
            const subbotFolder = path.join(process.cwd(), 'database', 'subbots', safeJid)
            
            if (fs.existsSync(subbotFolder)) {
                try {
                    fs.rmSync(subbotFolder, { recursive: true, force: true })
                } catch (e) {
                    console.error('Error limpiando carpeta vieja:', e)
                }
            }
            
            const result = await initializeSubBot(
                jid,
                {
                    generatePairingCode: true,
                    phoneNumber: numero,
                    subbotOwner: m.sender
                }
            )

            if (!result || !result.pairingCode) {
                return m.reply(
                    '*No se género el codigo, intenta nuevamente dentro de unos segundos*'
                )
            }

            return m.reply(
                `*ᥴodιgo:* *${result.pairingCode}*`
            )

        } catch (error) {
            console.error('Error en code:', error)
            return m.reply('*Error al generar código.*')
        }
    }
}
