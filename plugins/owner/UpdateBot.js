// pene
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

async function git(command, cwd) {
    return await execAsync(command, {
        cwd,
        maxBuffer: 1024 * 1024 * 10
    })
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
                    extractPureNumber(owner) === senderNum
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
            const { stdout: repoPath } =
                await execAsync(
                    'git rev-parse --show-toplevel',
                    {
                        cwd: process.cwd()
                    }
                )

            const cwd = repoPath.trim()

            if (!cwd) {
                throw new Error(
                    'No se encontró la raíz del repositorio Git'
                )
            }

            let branch = 'main'

            try {
                const { stdout } =
                    await git(
                        'git branch --show-current',
                        cwd
                    )

                branch =
                    stdout.trim() || 'main'
            } catch {
                branch = 'main'
            }

            await git(
                'git fetch origin',
                cwd
            )

            let aheadBehind

            try {
                const { stdout } =
                    await git(
                        `git rev-list --left-right --count HEAD...origin/${branch}`,
                        cwd
                    )

                const values =
                    stdout.trim().split(/\s+/)

                const localAhead =
                    Number(values[0] || 0)

                const remoteAhead =
                    Number(values[1] || 0)

                aheadBehind = {
                    localAhead,
                    remoteAhead
                }
            } catch {
                throw new Error(
                    `No se pudo comprobar origin/${branch}`
                )
            }

            if (aheadBehind.remoteAhead === 0) {
                await conn.sendMessage(
                    m.chat,
                    {
                        text:
                            '*El Socket ya está actualizado* ❀',
                        edit: message.key
                    }
                )

                if (typeof m.react === 'function') {
                    await m.react('✅')
                }

                return
            }

            const {
                stdout: pullOutput,
                stderr: pullError
            } = await git(
                `git pull --ff-only origin ${branch}`,
                cwd
            )

            if (
                pullError &&
                !pullOutput &&
                !pullError.includes(
                    'Already up to date'
                )
            ) {
                throw new Error(
                    pullError.trim()
                )
            }

            const output =
                pullOutput.trim()

            await conn.sendMessage(
                m.chat,
                {
                    text:
                        '*El Socket fue actualizado* ❀\n\n' +
                        '```' +
                        output +
                        '```',
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
                        '*Error al actualizar* ❀\n\n' +
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
