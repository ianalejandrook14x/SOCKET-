// Exec por Destroy modificado y adaptado por TewIanIx

import syntaxerror from 'syntax-error'
import { format } from 'util'
import { createRequire } from 'module'

export default {
    command: ['ex', 'e', 'exec', 'execute'],
    isOwner: true,

    async run(m, { conn, args, command, text }) {
        const require = createRequire(import.meta.url)

        if (!text.trim()) {
            return m.reply('*Ejecuta una secuencia en JavaScript* ❀')
        }

        const code = (command === 'e' ? 'return ' : '') + text

        let result
        let syntax = ''

        try {
            let limit = 15
            const module = { exports: {} }

            const AsyncFunction = Object.getPrototypeOf(
                async function () {}
            ).constructor

            const execute = new AsyncFunction(
                'print',
                'm',
                'conn',
                'require',
                'Array',
                'process',
                'args',
                'module',
                'exports',
                'argument',
                code
            )

            result = await execute.call(
                conn,
                (...values) => {
                    if (--limit < 1) return
                    return m.reply(format(...values))
                },
                m,
                conn,
                require,
                Array,
                process,
                args,
                module,
                module.exports,
                [conn]
            )
        } catch (error) {
            const err = syntaxerror(
                code,
                'Execution Function',
                {
                    allowReturnOutsideFunction: true,
                    allowAwaitOutsideFunction: true,
                    sourceType: 'module'
                }
            )

            if (err) {
                syntax = `${err}\n\n`
            }

            result = error
        }

        if (result !== undefined && result !== null) {
            return m.reply(syntax + format(result))
        }

        if (syntax) {
            return m.reply(syntax)
        }
    }
}
