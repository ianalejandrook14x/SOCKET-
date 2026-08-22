import fs from 'fs'
import path from 'path'
import pino from 'pino'
import NodeCache from 'node-cache'

import {
    default as makeWASocket,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    DisconnectReason
} from '@itsliaaa/baileys'

import { Boom } from '@hapi/boom'

import {
    getSubBots,
    saveSubBots
} from './database.js'

import handler from '../handler.js'

const ROOT = process.cwd()

const SUBBOTS_PATH = path.join(
    ROOT,
    'database',
    'subbots'
)

const ACTIVE_SUBBOTS = new Map()

const GENERATING_CODES = new Set()

const STARTING_SUBBOTS = new Set()

const STOPPED_SUBBOTS = new Set()

function delay(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    )

}

function createSubBotDirectory(jid) {

    const safeJid =
        String(jid)
            .replace(
                /[^a-zA-Z0-9_-]/g,
                '_'
            )


    const folder =
        path.join(
            SUBBOTS_PATH,
            safeJid
        )


    if (
        !fs.existsSync(
            folder
        )
    ) {

        fs.mkdirSync(
            folder,
            {
                recursive: true
            }
        )

    }


    return folder

}

function registerSubBot(
    jid,
    data = {}
) {

    const subbots =
        getSubBots()


    subbots[jid] = {

        ...(subbots[jid] || {}),

        jid,

        createdAt:
            subbots[jid]
                ?.createdAt ||
            Date.now(),

        connected:
            false,

        status:
            'disconnected',

        stopped:
            false,

        ...data

    }


    saveSubBots(
        subbots
    )


    return subbots[jid]

}

function getSubBot(jid) {

    const subbots =
        getSubBots()


    return (
        subbots[jid] ||
        null
    )

}

function updateSubBot(
    jid,
    data = {}
) {

    const subbots =
        getSubBots()


    if (
        !subbots[jid]
    ) {

        return null

    }


    subbots[jid] = {

        ...subbots[jid],

        ...data,

        updatedAt:
            Date.now()

    }


    saveSubBots(
        subbots
    )


    return subbots[jid]

}

function getAllSubBots() {

    return getSubBots()

}

function removeSubBot(jid) {

    const subbots =
        getSubBots()


    delete subbots[jid]


    saveSubBots(
        subbots
    )


    ACTIVE_SUBBOTS.delete(
        jid
    )

    GENERATING_CODES.delete(
        jid
    )

    STARTING_SUBBOTS.delete(
        jid
    )

    STOPPED_SUBBOTS.delete(
        jid
    )


    return true

}

function setActiveSubBot(
    jid,
    sock
) {

    ACTIVE_SUBBOTS.set(
        jid,
        sock
    )


    STOPPED_SUBBOTS.delete(
        jid
    )


    updateSubBot(
        jid,
        {
            connected:
                true,

            status:
                'connected',

            stopped:
                false
        }
    )

}

function getActiveSubBot(jid) {

    return ACTIVE_SUBBOTS.get(
        jid
    )

}

function removeActiveSubBot(
    jid
) {

    ACTIVE_SUBBOTS.delete(
        jid
    )


    updateSubBot(
        jid,
        {
            connected:
                false,

            status:
                'disconnected'
        }
    )

}

async function initializeSubBot(
    jid,
    options = {}
) {

    if (
        STARTING_SUBBOTS.has(
            jid
        )
    ) {

        console.log(
            `El Jadibot ${jid} ya se está iniciando.`
        )

        return null

    }


    if (
        STOPPED_SUBBOTS.has(
            jid
        )
    ) {

        console.log(
            `El Jadibot ${jid} fue detenido manualmente.`
        )

        return null

    }


    STARTING_SUBBOTS.add(
        jid
    )


    try {

        const folder =
            createSubBotDirectory(
                jid
            )


        const {
            state,
            saveCreds
        } =
            await useMultiFileAuthState(
                folder
            )


        const msgRetryCounterCache =
            new NodeCache()


        const sock =
            makeWASocket({

                auth: {

                    creds:
                        state.creds,

                    keys:
                        makeCacheableSignalKeyStore(
                            state.keys,

                            pino({
                                level:
                                    'silent'
                            })
                        )

                },


                logger:
                    pino({
                        level:
                            'silent'
                    }),


                // Browser actualizado
                browser:
                    [
                        'Ubuntu',
                        'Chrome',
                        '20.0.04'
                    ],


                msgRetryCounterCache,


                generateHighQualityLinkPreview:
                    true,


                syncFullHistory:
                    false

            })

        sock.ev.on(
            'creds.update',
            saveCreds
        )

        sock.isMainBot =
            false

        sock.isSubBot =
            true

        sock.subBotJid =
            jid


        if (
            options.subbotOwner
        ) {

            sock.subbotOwner =
                options.subbotOwner

        }


        registerSubBot(
            jid,
            {
                owner:
                    options.subbotOwner ||
                    jid,

                stopped:
                    false
            }
        )

        sock.ev.on(
            'connection.update',

            async ({
                connection,
                lastDisconnect
            }) => {


                if (
                    connection ===
                    'connecting'
                ) {

                    console.log(
                        `Conectando Jadibot: ${jid}`
                    )

                }


                if (
                    connection ===
                    'open'
                ) {

                    console.log(
                        `JADIBOT CONECTADO: ${jid}`
                    )


                    STARTING_SUBBOTS.delete(
                        jid
                    )


                    setActiveSubBot(
                        jid,
                        sock
                    )

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


                    const wasStopped =
                        STOPPED_SUBBOTS.has(
                            jid
                        )


                    removeActiveSubBot(
                        jid
                    )


                    STARTING_SUBBOTS.delete(
                        jid
                    )


                    console.log(
                        `Conexión cerrada: ${jid}`
                    )


                    console.log(
                        `Código: ${statusCode}`
                    )
                   
                    if (
                        wasStopped
                    ) {

                        console.log(
                            `Jadibot detenido manualmente: ${jid}`
                        )

                        return

                    }


                    const shouldReconnect =
                        statusCode !==
                        DisconnectReason
                            .loggedOut


                    if (
                        shouldReconnect
                    ) {

                        console.log(
                            `Reconectando Jadibot: ${jid}`
                        )


                        await delay(
                            5000
                        )


                        if (
                            !STOPPED_SUBBOTS.has(
                                jid
                            )
                        ) {

                            initializeSubBot(
                                jid,
                                {
                                    subbotOwner:
                                        options.subbotOwner
                                }
                            )

                        }

                    } else {

                        console.log(
                            `Sesión cerrada definitivamente: ${jid}`
                        )

                    }

                }

            }

        )

        sock.ev.on(
            'messages.upsert',

            async ({
                messages,
                type
            }) => {

                if (
                    type &&
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


                    try {

                        await handler(
                            sock,
                            message
                        )

                    } catch (
                        error
                    ) {

                        console.error(
                            `Error en Jadibot: ${jid}:`,
                            error
                        )

                    }

                }

            }

        )
        
        if (

            options.generatePairingCode &&

            !state.creds.registered

        ) {


            if (
                GENERATING_CODES.has(
                    jid
                )
            ) {

                return {

                    sock,

                    pairingCode:
                        null

                }

            }


            GENERATING_CODES.add(
                jid
            )


            try {

                // Espera importante
                await delay(
                    5000
                )


                const phoneNumber =
                    String(
                        options.phoneNumber ||
                        jid
                    )
                        .replace(
                            /\D/g,
                            ''
                        )


                if (
                    !phoneNumber
                ) {

                    throw new Error(
                        'Número inválido'
                    )

                }


                console.log(
                    `Solicitando código para: ${phoneNumber}`
                )


                const pairingCode =
                    await sock.requestPairingCode(
                        phoneNumber
                    )


                console.log(
                    `Código generado: ${pairingCode}`
                )


                return {

                    sock,

                    pairingCode

                }

            } finally {

                GENERATING_CODES.delete(
                    jid
                )

            }

        }


        return sock


    } catch (
        error
    ) {

        STARTING_SUBBOTS.delete(
            jid
        )

        GENERATING_CODES.delete(
            jid
        )


        console.error(
            `❌ Error inicializando subbot ${jid}:`,
            error
        )


        return null

    }

}

async function stopSubBot(jid) {

    // Marcar primero como detenido
    // para evitar reconexión automática

    STOPPED_SUBBOTS.add(
        jid
    )


    updateSubBot(
        jid,
        {
            connected:
                false,

            status:
                'stopped',

            stopped:
                true
        }
    )


    const sock =
        getActiveSubBot(
            jid
        )


    if (
        !sock
    ) {

        console.log(
            `No hay socket activo para ${jid}`
        )

        return true

    }


    try {
       
        if (
            typeof sock.ws?.close ===
            'function'
        ) {

            sock.ws.close()

        } else if (
            typeof sock.end ===
            'function'
        ) {

            sock.end(
                undefined
            )

        }

    } catch (
        error
    ) {

        console.error(
            `Error cerrando subbot ${jid}:`,
            error
        )

    }


    ACTIVE_SUBBOTS.delete(
        jid
    )


    return true

}

async function restartSubBot(jid) {

    STOPPED_SUBBOTS.delete(
        jid
    )


    await stopSubBot(
        jid
    )


    STOPPED_SUBBOTS.delete(
        jid
    )


    await delay(
        2000
    )


    return initializeSubBot(
        jid
    )

}

function listSubBots() {

    return getSubBots()

}

function isGeneratingCode(jid) {

    return GENERATING_CODES.has(
        jid
    )

}


function setGeneratingCode(jid) {

    GENERATING_CODES.add(
        jid
    )

}


function removeGeneratingCode(jid) {

    GENERATING_CODES.delete(
        jid
    )

}

async function initializeAllSubBots() {

    const subbots =
        getSubBots()


    for (
        const jid
        of Object.keys(
            subbots
        )
    ) {

        const subbot =
            subbots[jid]
       
        if (
            subbot.stopped ===
            true
        ) {

            continue

        }


        const folder =
            createSubBotDirectory(
                jid
            )


        const creds =
            path.join(
                folder,
                'creds.json'
            )


        if (
            fs.existsSync(
                creds
            )
        ) {

            console.log(
                `Inciando Jadibot: ${jid}`
            )


            await initializeSubBot(
                jid,
                {
                    subbotOwner:
                        subbot.owner
                }
            )


            await delay(
                1000
            )

        }

    }

}

async function disconnectAllSubBots() {

    for (
        const [
            jid,
            sock
        ]
        of ACTIVE_SUBBOTS
    ) {

        STOPPED_SUBBOTS.add(
            jid
        )


        try {

            if (
                typeof sock.ws?.close ===
                'function'
            ) {

                sock.ws.close()

            } else if (
                typeof sock.end ===
                'function'
            ) {

                sock.end(
                    undefined
                )

            }

        } catch {}


        removeActiveSubBot(
            jid
        )

    }

}

export {

    SUBBOTS_PATH,

    ACTIVE_SUBBOTS,

    GENERATING_CODES,

    createSubBotDirectory,

    registerSubBot,

    getSubBot,

    updateSubBot,

    getAllSubBots,

    removeSubBot,

    setActiveSubBot,

    getActiveSubBot,

    removeActiveSubBot,

    initializeSubBot,

    initializeAllSubBots,

    stopSubBot,

    restartSubBot,

    disconnectAllSubBots,

    listSubBots,

    isGeneratingCode,

    setGeneratingCode,

    removeGeneratingCode

}
