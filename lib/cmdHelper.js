/*
•❅──────✧✦✧──────❅•
Codigo Creado Por CUERVO-TEAM-SUPREME
Para Elymas-Bot Este Codigo Es 
Exclusivo Y Unico Para Este Bot Al 
Clonar O Copiar Dejar Estos Creditos 
De Cuervo-Team-Supreme
━━━━━ ☾☽ ━━━━━
ʚĭɞ ೃ CODIGO JAVASCRIPT ʚĭɞ ೃ
ʚĭɞ ೃ codigo :: lib/cmdHelper.js
ʚĭɞ ೃ funcion :: Helper para localizar archivos de plugins segun el comando
──────✧✦✧──────
*/

import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

const PLUGINS_DIR = path.resolve('./plugins')

export function findPluginFile(commandName, dir = PLUGINS_DIR) {
    const files = fs.readdirSync(dir)

    for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
            const found = findPluginFile(commandName, fullPath)
            if (found) return found
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf-8')
            const regex = new RegExp(`command:\\s*\\[?.*?['"\`]${commandName}['"\`]`, 'i')
            if (regex.test(content)) {
                return fullPath
            }
        }
    }
    return null
}
