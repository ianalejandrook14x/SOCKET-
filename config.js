/*
Configuraciones globales.
*/

export const config = {

    botName: 'sᥲtsυkι tᥲᥴhιbᥲᥒᥲ',
    ownerName: 'TewIanIx',

    owners: [
        // Ian
        '5493876639332',
        // Duarte
        '573135180876',
        // Yo Soy Yo
        '573133374132',
        
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
        title: 'sᥲtsυkι tᥲᥴhιbᥲᥒᥲ',
        description: 'WhatsApp bot',
        footer: 'Simple.'
    },

    subbots: {
        enabled: true,
        folder: './database/subbots',
        database: './database/subbots.json'
    }
}

export default config
