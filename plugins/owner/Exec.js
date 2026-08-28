import util from 'util'

export default {
    command: ['exec', 'ex', 'e', 'execute'],

    isOwner: true,

    run: async (m, { conn, text, isOwner }) => {

        if (!isOwner) {
            return m.reply('*Este comando solo puede ser utilizado por el creador* ✿')
        }

        if (!text) {
            return m.reply('*Este es un entorno JS, ejecuta con sus extensiones* ❀')
        }

        try {
            let result = await eval(text)

            if (typeof result !== 'string') {
                result = util.inspect(result, { depth: 1 })
            }

            if (result && result !== 'undefined') {
                await m.reply(result)
            }

        } catch (error) {
            await m.reply(
                `*Error al ejecutar:*\n\n\`\`\`javascript\n${util.format(error)}\n\`\`\``
            )
        }
    }
}
