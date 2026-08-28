export default {
    command: ['e', 'exec', 'execute'],

    async run(m, { conn, sock, message, args = [], text = '', isOwner }) {
        if (!isOwner) {
            return m.reply('*Este comando solo puede ser ejecutado por el creador* ✿')
        }

        const code = String(text || '').trim()

        if (!code) {
            return m.reply('*Ejecuta una secuencia en JavaScript* ❀')
        }

        try {
            const AsyncFunction = Object.getPrototypeOf(
                async function () {}
            ).constructor

            const execute = new AsyncFunction(
                'm',
                'conn',
                'sock',
                'message',
                'args',
                'process',
                'global',
                code
            )

            const result = await execute(
                m,
                conn,
                sock,
                message,
                args,
                process,
                global
            )

            if (result !== undefined && result !== null) {
                await m.reply(String(result))
            }
        } catch (error) {
            await m.reply(
                `*Error al ejecutar JavaScript*\n\n${error?.stack || error}`
            )
        }
    }
}
