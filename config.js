/*
•❅──────✧✦✧──────❅•
Codigo Creado Por CUERVO-TEAM-SUPREME
Para Elymas-Bot Este Codigo Es 
Exclusivo Y Unico Para Este Bot Al 
Clonar O Copiar Dejar Estos Creditos 
De Cuervo-Team-Supreme
━━━━━ ☾☽ ━━━━━
ʚĭɞ ೃ CODIGO JAVASCRIPT ʚĭɞ ೃ
ʚĭɞ ೃ codigo :: config.js
ʚĭɞ ೃ funcion :: configuracion principal del bot
ʚĭɞ ೃ estado :: completo
──────✧✦✧──────
*/

export const config = {

    botName: 'Cuervo',
    ownerName: 'TheDevil',

    owners: [
        // The Devil (numero off)
        '886958381686',
        '250405971824657',
        // The Devil (numero nuevo)
        '818021404021',
        '47344095637596'
    ],

    prefixes: [
        '.',
        '#',
        '!',
        '/'
    ],

    sessionName: './sessions/principal',

    pluginsFolder: './plugins',

    databaseFolder: './database',

    printQRInTerminal: true,
    loggerLevel: 'silent',

    menu: {
        title: '🌱 CUERVO BOT',
        description: 'Bot de WhatsApp modular',
        footer: '© Cuervo Bot'
    },

    subbots: {
        enabled: true,
        folder: './database/subbots',
        database: './database/subbots.json'
    }
}

export default config
