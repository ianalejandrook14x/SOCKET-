/*
•❅──────✧✦✧──────❅•
Codigo Creado Por CUERVO-TEAM-SUPREME
Para Elymas-Bot Este Codigo Es 
Exclusivo Y Unico Para Este Bot Al 
Clonar O Copiar Dejar Estos Creditos 
De Cuervo-Team-Supreme
━━━━━ ☾☽ ━━━━━
ʚĭɞ ೃ CODIGO JAVASCRIPT ʚĭɞ ೃ
ʚĭɞ ೃ codigo :: lib/jid.js
ʚĭɞ ೃ funcion :: normalizar lid a jid para evitar errores
ʚĭɞ ೃ estado :: completo
──────✧✦✧──────
*/


function normalizeJid(
jid
) {

if (
    !jid
) {

    return ''

}


jid =
    String(
        jid
    )
    .trim()


if (
    jid.includes(':')
) {

    jid =
        jid.split(':')[0]

}


return jid

}

function jidToNumber(
jid
) {

if (
    !jid
) {

    return ''

}


return String(
    jid
)
.split('@')[0]
.split(':')[0]

}

function isJid(
jid
) {

return Boolean(

    jid &&
    jid.includes('@')

)

}

function isGroupJid(
jid
) {

return Boolean(

    jid &&
    jid.endsWith(
        '@g.us'
    )

)

}

function isLid(
jid
) {

return Boolean(

    jid &&
    jid.endsWith(
        '@lid'
    )

)

}

function isUserJid(
jid
) {

if (
    !jid
) {

    return false

}


return (

    jid.endsWith(
        '@s.whatsapp.net'
    )

    ||

    jid.endsWith(
        '@lid'
    )

)

}

function toJid(
value
) {

if (
    !value
) {

    return ''

}


value =
    String(
        value
    )
    .trim()


if (
    value.includes('@')
) {

    return value

}


const number =
    value.replace(
        /\D/g,
        ''
    )


if (
    !number
) {

    return ''

}


return `${number}@s.whatsapp.net`

}

function getSender(
message
) {

if (
    !message
) {

    return ''

}


return (

    message.key?.participant

    ||

    message.participant

    ||

    message.key?.remoteJid

    ||

    ''

)

}

function sameJid(
jid1,
jid2
) {

if (
    !jid1 ||
    !jid2
) {

    return false

}


return (

    normalizeJid(
        jid1
    )

    ===

    normalizeJid(
        jid2
    )

)

}

export {

normalizeJid,

jidToNumber,

isJid,

isGroupJid,

isLid,

isUserJid,

toJid,

getSender,

sameJid

}
