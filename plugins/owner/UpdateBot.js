import { exec } from 'child_process'
import util from 'util'
import config from '../../config.js'

const execAsync = util.promisify(exec)

function extractPureNumber(target) {
    if (!target) return ''

    return String(target)
        .split('@')[0]
        .split(':')[0]
        .replace(/[^0-9]/g, '')
}

export default {
    command: [
        'fix',
        'update',
        'actualizar',
        'gitpull'
    ],

    async run(m, { conn }) {
        const senderJid =
            m?.sender ||
            m?.key?.participant ||
            m?.key?.remoteJid ||
            ''

        const senderNum =
            extractPureNumber(senderJid)

        const isMainOwner =
            Array.isArray(config?.owners) &&
            config.owners.some(
                owner =>
                    extractPureNumber(owner) ===
                    senderNum
            )

        if (!isMainOwner) {
            return m.reply(
                '*Este comando solo puede ser ejecutado por el creador*'
            )
        }

        await m.reply(
            '*sᥲtsυkι*\n\n' +
            '> BAC'
        )

        try {
            await execAsync(
                'git fetch origin'
            )

            const { stdout: status } =
                await execAsync(
                    'git status -uno'
                )

            const hasUpdates =
                status.includes(
                    'Your branch is behind'
                ) ||
                status.includes(
                    'Tu rama está detrás'
                ) ||
                status.includes(
                    'can be fast-forwarded'
                ) ||
                status.includes(
                    'puede ser actualizada'
                )

            if (!hasUpdates) {
                return m.reply(
                    '*sᥲtsυkι*\n\n' +
                    'No existen cambios nuevos en el repositorio'
                )
            }

            await m.reply(
                '*sᥲtsυkι*\n\n' +
                'Descargando actualizaciones del repositorio'
            )

            let branch = 'main'

            try {
                const { stdout } =
                    await execAsync(
                        'git branch --show-current'
                    )

                branch =
                    stdout.trim() || 'main'
            } catch {
                branch = 'main'
            }

            const {
                stdout: pullOutput,
                stderr: pullError
            } = await execAsync(
                `git pull origin ${branch}`
            )

            if (
                pullError &&
                !pullOutput
            ) {
                return m.reply(
                    '*sᥲtsυkι*\n\n' +
                    'Error al actualizar\n\n' +
                    pullError
                )
            }

            const output =
                pullOutput.trim()

            if (
                output.includes(
                    'Already up to date.'
                ) ||
                output.includes(
                    'Already up-to-date'
                )
            ) {
                return m.reply(
                    '*sᥲtsυkι*\n\n' +
                    'No existen cambios en el repositorio'
                )
            }

            return m.reply(
                '*sᥲtsυkι*\n\n' +
                '```\n' +
                output +
                '\n```'
            )

        } catch (error) {
            console.error(
                'Error al actualizar:',
                error
            )

            return m.reply(
                '*sᥲtsυkι*\n\n' +
                'Error al actualizar.\n\n' +
                `${error?.message || 'Error desconocido'}`
            )
        }
    }
}
