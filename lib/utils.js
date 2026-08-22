import fs from 'fs'

function sleep(
milliseconds
) {

return new Promise(

    resolve =>

        setTimeout(
            resolve,
            milliseconds
        )

)

}

function randomInt(
min,
max
) {

min =
    Math.ceil(
        min
    )


max =
    Math.floor(
        max
    )


return Math.floor(

    Math.random()
    *
    (
        max -
        min +
        1
    )

    +

    min

)

}

function pick(
array
) {

if (
    !Array.isArray(
        array
    )

    ||

    array.length === 0
) {

    return null

}


return array[
    randomInt(
        0,
        array.length - 1
    )
]

}

function fileExists(
file
) {

return fs.existsSync(
    file
)

}

function ensureFolder(
folder
) {

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

function formatTime(
milliseconds
) {

const seconds =
    Math.floor(
        milliseconds / 1000
    )


const days =
    Math.floor(
        seconds / 86400
    )


const hours =
    Math.floor(
        (
            seconds % 86400
        )
        /
        3600
    )


const minutes =
    Math.floor(
        (
            seconds % 3600
        )
        /
        60
    )


const secs =
    seconds %
    60


return [

    days
        ? `${days}d`
        : '',

    hours
        ? `${hours}h`
        : '',

    minutes
        ? `${minutes}m`
        : '',

    `${secs}s`

]
.filter(
    Boolean
)
.join(' ')

}

function formatNumber(
number
) {

return Number(
    number || 0
)
.toLocaleString(
    'en-US'
)

}

function chance(
percentage
) {

return Math.random()
    *
    100
    <
    percentage

}

export {

sleep,

randomInt,

pick,

fileExists,

ensureFolder,

formatTime,

formatNumber,

chance

}
