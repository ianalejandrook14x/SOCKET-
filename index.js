/*
•❅──────✧✦✧──────❅•
Codigo Creado Por CUERVO-TEAM-SUPREME
Para Elymas-Bot Este Codigo Es 
Exclusivo Y Unico Para Este Bot Al 
Clonar O Copiar Dejar Estos Creditos 
De Cuervo-Team-Supreme
━━━━━ ☾☽ ━━━━━
ʚĭɞ ೃ CODIGO JAVASCRIPT ʚĭɞ ೃ
ʚĭɞ ೃ codigo :: index.js
ʚĭɞ ೃ funcion :: inicio de bot e integracion de bienvenidas/despedidas
ʚĭɞ ೃ estado :: completo
──────✧✦✧──────
*/

import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} from '@itsliaaa/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import fs from 'fs'
import readline from 'readline'
import config from './config.js'

import handler, {
    loadPlugins
} from './handler.js'

import {
    initializeAllSubBots
} from './lib/subbots.js'

import { processWelcome } from './lib/welcome.js'

let restartingMainBot = false
let subbotsLoaded = false

function createFolders() {

    const folders = [
        './sessions',
        './sessions/principal',
        './database',
        './database/subbots',
        './plugins'
    ]


    for (
        const folder
        of folders
    ) {

        if (
            !fs.existsSync(
                folder
            )
        ) {

            fs.mkdirSync(
                folder,
                {
                    recursive:
                        true
                }
            )

        }

    }


    const files = {
        './database/usuarios.json':
            {},
        './database/grupos.json':
            {},
        './database/subbots.json':
            {}
    }


    for (
        const [
            file,
            content
        ]
        of Object.entries(
            files
        )
    ) {

        if (
            !fs.existsSync(
                file
            )
        ) {

            fs.writeFileSync(

                file,

                JSON.stringify(
                    content,
                    null,
                    2
                )

            )

        }

    }

}


function question(
    text
) {
    const rl =
        readline.createInterface({
            input:
                process.stdin,
            output:
                process.stdout
        })

    return new Promise(
        resolve => {
            rl.question(
                text,
                answer => {
                    rl.close()
                    resolve(
                        answer.trim()
                    )
                }
            )
        }
    )
}

async function getPhoneNumber() {

    let number =
        ''


    while (
        !number
    ) {

        number =
            await question(

                '\n📱 Ingresa el número de WhatsApp con código de país:\n> '

            )


        number =
            number.replace(
                /[^0-9]/g,
                ''
            )


        if (
            !number
        ) {

            console.log(
                '❌ Número inválido.'
            )

        }

    }


    return number

}


async function startBot() {

    createFolders()


    await loadPlugins()


    console.log(`

╔══════════════════════════════════════╗
║          🌱 CUERVO BOT               ║
║                                      ║
║        Iniciando bot principal       ║
╚══════════════════════════════════════╝

`)


    const {
        state,
        saveCreds
    } =
        await useMultiFileAuthState(
            config.sessionName
        )


    const sock =
        makeWASocket({

            auth:
                state,


            logger:
                pino({

                    level:
                        config.loggerLevel

                }),


            // Browser actualizado
            browser:
                [
                    'Ubuntu',
                    'Chrome',
                    '20.0.04'
                ],


            printQRInTerminal:
                false,


            isMainBot:
                true,


            botName:
                config.botName

        })


    sock.isMainBot =
        true

    sock.isSubBot =
        false

    sock.botType =
        'main'

    sock.botName =
        config.botName

    sock.ev.on(
        'creds.update',
        saveCreds
    )

    sock.ev.on(

        'connection.update',

        async update => {

            const {

                connection,

                lastDisconnect

            } =
                update


            if (
                connection ===
                'connecting'
            ) {

                console.log(
                    '🔄 Conectando con WhatsApp...'
                )

            }


            if (
                connection ===
                'open'
            ) {

                console.log(`

╔══════════════════════════════════════╗
║       ✅ BOT CONECTADO                ║
║                                      ║
║       🌱 ${config.botName}
╚══════════════════════════════════════╝

`)

                if (
                    !subbotsLoaded
                ) {

                    subbotsLoaded =
                        true


                    try {

                        console.log(
                            '🤖 Cargando subbots guardados...'
                        )


                        await initializeAllSubBots()


                        console.log(
                            '✅ Subbots cargados correctamente.'
                        )


                    } catch (
                        error
                    ) {

                        console.error(
                            '❌ Error cargando subbots:',
                            error
                        )

                    }

                }

            }


            if (
                connection ===
                'close'
            ) {

                const statusCode =
                    new Boom(
                        lastDisconnect
                            ?.error
                    )
                        ?.output
                        ?.statusCode


                const shouldReconnect =
                    statusCode !==
                    DisconnectReason
                        .loggedOut


                console.log(
                    '⚠️ Conexión cerrada.'
                )


                console.log(
                    '📛 Código:',
                    statusCode
                )


                if (
                    shouldReconnect &&
                    !restartingMainBot
                ) {

                    restartingMainBot =
                        true


                    console.log(
                        '🔄 Reconectando bot principal...'
                    )


                    setTimeout(
                        () => {

                            restartingMainBot =
                                false


                            startBot()

                        },

                        5000

                    )

                } else if (
                    !shouldReconnect
                ) {

                    console.log(
                        '🚪 Sesión cerrada. Debes volver a vincular el bot.'
                    )

                }

            }

        }

    )

    if (
        !state.creds.registered
    ) {

        const phoneNumber =
            await getPhoneNumber()


        try {

            console.log(
                '⏳ Preparando código de vinculación...'
            )


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        5000
                    )
            )


            const pairingCode =
                await sock.requestPairingCode(
                    phoneNumber
                )


            console.log(`

╔══════════════════════════════════════╗
║       🔐 CÓDIGO DE VINCULACIÓN       ║
╠══════════════════════════════════════╣
║                                      ║
║       ${pairingCode}
║                                      ║
╚══════════════════════════════════════╝

📱 Abre WhatsApp en tu teléfono.

Ve a:

Dispositivos vinculados
        ↓
Vincular un dispositivo
        ↓
Vincular con número de teléfono

Introduce el código mostrado arriba.

`)


        } catch (
            error
        ) {

            console.error(
                '❌ Error generando código:',
                error
            )

        }

    }

    // LISTENER PARA BIENVENIDAS Y DESPEDIDAS DE GRUPO
    sock.ev.on(
        'group-participants.update',
        async update => {

            try {

                await processWelcome(
                    sock,
                    update
                )

            } catch (
                error
            ) {

                console.error(
                    '❌ Error procesando evento de grupo:',
                    error
                )

            }

        }
    )

    sock.ev.on(

        'messages.upsert',

        async ({
            messages,
            type
        }) => {

            try {

                if (
                    type !==
                    'notify'
                ) {

                    return

                }


                for (
                    const message
                    of messages
                ) {

                    if (
                        !message ||
                        !message.message
                    ) {

                        continue

                    }


                    await handler(
                        sock,
                        message
                    )

                }


            } catch (
                error
            ) {

                console.error(
                    '❌ Error procesando mensaje:',
                    error
                )

            }

        }

    )


    return sock

}


startBot()
    .catch(
        error => {

            console.error(
                '❌ Error fatal:',
                error
            )

        }
    )
