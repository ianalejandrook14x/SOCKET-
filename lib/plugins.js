import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename =
fileURLToPath(
import.meta.url
)

const __dirname =
path.dirname(
__filename
)

const pluginsPath =
path.join(
__dirname,
'..',
'plugins'
)

global.plugins =
global.plugins ||
{}

function getAllFiles(
directory
) {

let files = []


if (
    !fs.existsSync(
        directory
    )
) {

    return files

}


const items =
    fs.readdirSync(
        directory
    )


for (
    const item
    of items
) {

    const fullPath =
        path.join(
            directory,
            item
        )


    const stat =
        fs.statSync(
            fullPath
        )


    if (
        stat.isDirectory()
    ) {

        files.push(

            ...getAllFiles(
                fullPath
            )

        )

    } else {

        files.push(
            fullPath
        )

    }

}


return files

}

async function loadPlugins() {

if (
    !fs.existsSync(
        pluginsPath
    )
) {

    fs.mkdirSync(

        pluginsPath,

        {
            recursive: true
        }

    )

}


const files =
    getAllFiles(
        pluginsPath
    )


let loaded = 0


for (
    const file
    of files
) {

    if (
        !file.endsWith(
            '.js'
        )
    ) {

        continue

    }


    try {

        const fileUrl =
            `file://${file}?update=${Date.now()}`


        const imported =
            await import(
                fileUrl
            )


        const plugin =
            imported.default ||
            imported


        const pluginName =
            path.relative(
                pluginsPath,
                file
            )
            .replace(
                /\\/g,
                '/'
            )


        global.plugins[
            pluginName
        ] =
            plugin


        loaded++


    } catch (
        error
    ) {

        console.error(

            `Error cargando plugin ${file}:`,

            error

        )

    }

}


console.log(
    `Plugins cargados: ${loaded}`
)


return global.plugins

}

async function reloadPlugin(
file
) {

try {

    const absolutePath =
        path.isAbsolute(
            file
        )

            ? file

            : path.join(
                pluginsPath,
                file
            )


    const fileUrl =
        `file://${absolutePath}?update=${Date.now()}`


    const imported =
        await import(
            fileUrl
        )


    const plugin =
        imported.default ||
        imported


    const pluginName =
        path.relative(
            pluginsPath,
            absolutePath
        )
        .replace(
            /\\/g,
            '/'
        )


    global.plugins[
        pluginName
    ] =
        plugin


    return plugin


} catch (
    error
) {

    console.error(
        'Error recargando plugin:',
        error
    )


    return null

}

}

function getPlugin(
name
) {

return global.plugins[
    name
]

}

export {

getAllFiles,

loadPlugins,

reloadPlugin,

getPlugin

}
