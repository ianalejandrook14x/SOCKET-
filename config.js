/*
Fixxedd
*/

export const config = {

    botName: 'F I X X E D',
    ownerName: 'TewIanIx',

    owners: [
        // Ian
        '5493876639332'
    ],

    prefixes: [
        '#'
    ],

    sessionName: './sessions/principal',

    pluginsFolder: './plugins',

    databaseFolder: './database',

    printQRInTerminal: true,
    loggerLevel: 'silent',

    menu: {
        title: 'F I X X E D',
        description: 'WhatsApp bot',
        footer: 'By TewIanIx'
    },

    subbots: {
        enabled: true,
        folder: './database/subbots',
        database: './database/subbots.json'
    }
}

export default config
