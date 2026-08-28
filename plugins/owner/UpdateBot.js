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
                '*Este comando solo puede ser ejecutado por el creador. ❀*'
            )
        }

        if (typeof m.react === 'function') {
            await m.react('🕘')
        }

        const message = await m.reply(
            '❀ *Buscando actualización*'
        )

        try {
            await execAsync('git fetch origin')

            const { stdout: status } =
                await execAsync('git status -uno')

            const hasUpdates =
                status.includes('Your branch is behind') ||
                status.includes('Tu rama está detrás') ||
                status.includes('can be fast-forwarded') ||
                status.includes('puede ser actualizada')

            if (!hasUpdates) {
                await conn.sendMessage(
                    m.chat,
                    {
                        text: '*El Socket ya esta actualizado* ❀',
                        edit: message.key
                    }
                )

                if (typeof m.react === 'function') {
                    await m.react('✅')
                }

                return
            }

            let branch = 'main'

            try {
                const { stdout: currentBranch } =
                    await execAsync(
                        'git branch --show-current'
                    )

                branch =
                    currentBranch.trim() || 'main'
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
                await conn.sendMessage(
                    m.chat,
                    {
                        text:
                            'Error al actualizar.\n\n' +
                            pullError.trim(),
                        edit: message.key
                    }
                )

                if (typeof m.react === 'function') {
                    await m.react('❌')
                }

                return
            }

            const output =
                pullOutput.trim()

            if (
                output.includes('Already up to date.') ||
                output.includes('Already up-to-date')
            ) {
                await conn.sendMessage(
                    m.chat,
                    {
                        text: '*El Socket ya se encuentra actualizado* ❀',
                        edit: message.key
                    }
                )

                if (typeof m.react === 'function') {
                    await m.react('✅')
                }

                return
            }

            await conn.sendMessage(
                m.chat,
                {
                    text:
                        '*El Socket fue actualizado* ❀',
                    edit: message.key
                }
            )

            if (typeof m.react === 'function') {
                await m.react('✅')
            }

        } catch (error) {
            console.error(
                'Error al actualizar:',
                error
            )

            await conn.sendMessage(
                m.chat,
                {
                    text:
                        'Error al actualizar.\n\n' +
                        `${error?.message || 'Error desconocido'}`,
                    edit: message.key
                }
            )

            if (typeof m.react === 'function') {
                await m.react('❌')
            }
        }
    }
}
