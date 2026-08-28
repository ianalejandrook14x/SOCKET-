import util from 'util'
import config from '../../config.js'

function extractPureNumber(target) {
    if (!target) return ''

    return String(target)
        .split('@')[0]
        .split(':')[0]
        .replace(/[^0-9]/g, '')
}

export default {
    command: ['exec', 'ex', 'e', 'execute'],

    async run(m, { conn, args, text, message }) {
        const senderJid =
            m?.sender ||
            m?.key?.participant ||
            m?.key?.remoteJid ||
            ''

        const senderNum = extractPureNumber(senderJid)

        const isOwner =
            Array.isArray(config?.owners) &&
            config.owners.some(
                owner =>
                    extractPureNumber(owner) === senderNum
            )

        if (!isOwner) {
            return m.reply(
                '*Este comando solo puede ser ejecutado por el creador. ❀*'
            )
        }

        if (!text?.trim()) {
            return m.reply(
                '*Ejecuta una secuencia en JavaScript* ❀'
            )
        }

        try {
            const AsyncFunction =
                Object.getPrototypeOf(
                    async function () {}
                ).constructor

            const execute = new AsyncFunction(
                'm',
                'conn',
                'args',
                'message',
                'process',
                'global',
                `
                return await (async () => {
                    ${text}
                })()
                `
            )

            const result = await execute(
                m,
                conn,
                args,
                message,
                process,
                global
            )

            if (result === undefined || result === null) {
                return
            }

            if (
                typeof result === 'object' &&
                result?.key &&
                result?.message
            ) {
                return
            }

            const output =
                typeof result === 'string'
                    ? result
                    : util.inspect(result, {
                        depth: 3,
                        colors: false
                    })

            await m.reply(output)

        } catch (error) {
            await m.reply(
                '*Error al ejecutar JavaScript:*\n\n' +
                util.format(error)
            )
        }
    }
}
