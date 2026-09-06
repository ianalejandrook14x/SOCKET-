import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

const execFileAsync = promisify(execFile)

const TIKTOK_API = 'https://api.delirius.online/download/tiktok'

const nose = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://www.tiktok.com/'
}

const tiktokCache = new Map()

export default {
    command: ['test'],

    async run(m, { conn, args }) {

        if (
            m.text?.trim() === '#tiktokaudio' ||
            m.body?.trim() === '#tiktokaudio' ||
            m.message?.conversation?.trim() === '#tiktokaudio'
        ) {

            const cached = tiktokCache.get(m.chat)

            if (!cached) {
                return m.reply(
                    'No encontro un video reciente.'
                )
            }

            let tempVideo
            let tempAudio

            try {

                if (typeof m.react === 'function') {
                    await m.react('⏳')
                }

                const random = Math.random().toString(36).slice(2)

                tempVideo = path.join(
                    os.tmpdir(),
                    `tiktok-${random}.mp4`
                )

                tempAudio = path.join(
                    os.tmpdir(),
                    `tiktok-${random}.mp3`
                )

                await fs.writeFile(tempVideo, cached.video)

                await execFileAsync('ffmpeg', [
                    '-y',
                    '-i', tempVideo,
                    '-vn',
                    '-acodec', 'libmp3lame',
                    '-b:a', '128k',
                    tempAudio
                ])

                const audioBuffer = await fs.readFile(tempAudio)

                await conn.sendMessage(
                    m.chat,
                    {
                        audio: audioBuffer,
                        mimetype: 'audio/mpeg',
                        fileName: 'tiktok-audio.mp3'
                    },
                    { quoted: m }
                )

                if (typeof m.react === 'function') {
                    await m.react('✅')
                }

            } catch (error) {

                console.error('Error al extraer el audio:', error)

                if (typeof m.react === 'function') {
                    await m.react('❌')
                }

                return m.reply(
                    `*No se pudo extraer el audio*\n\n${error?.message || 'Error desconocido'}`
                )

            } finally {

                if (tempVideo) {
                    try {
                        await fs.unlink(tempVideo)
                    } catch {}
                }

                if (tempAudio) {
                    try {
                        await fs.unlink(tempAudio)
                    } catch {}
                }
            }

            return
        }

        if (!args || args.length === 0) {
            return m.reply(
                '*Downloader | Tiktok*\n\n' +
                '*Uso:*\n' +
                '*#tiktok https://vt.tiktok.com/xxxxx*\n' +
                '*#tiktok https://vt.tiktok.com/xxxxx --hd* | Calidad HD'
            )
        }

        const hd = args.some(
            a => a.toLowerCase() === '--hd'
        )

        const url = args
            .filter(arg => arg.toLowerCase() !== '--hd')
            .join(' ')
            .trim()

        if (!url) {
            return m.reply(
                '*Uso correcto:*\n\n' +
                '> *#tiktok https://vt.tiktok.com/xxxxx --hd*'
            )
        }

        if (
            !url.includes('tiktok.com') &&
            !url.includes('vm.tiktok.com') &&
            !url.includes('vt.tiktok.com') &&
            !url.includes('www.tiktok.com')
        ) {
            return m.reply('Ingresa un enlace de TikTok')
        }

        try {

            if (typeof m.react === 'function') {
                await m.react('🕗')
            }

            const apiURL =
                `${TIKTOK_API}?url=${encodeURIComponent(url)}`

            const response = await fetch(apiURL)

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status} ${response.statusText}`
                )
            }

            const json = await response.json()

            if (!json || json.status !== true) {
                throw new Error(
                    'La API no devolvió resultado.'
                )
            }

            const data = json.data

            if (!data) {
                throw new Error(
                    'La API no tiene respuesta del contenido.'
                )
            }

            const media = data.meta?.media || []

            if (
                !Array.isArray(media) ||
                media.length === 0
            ) {
                throw new Error(
                    'La API no devolvió ningún archivo'
                )
            }

            const id = data.id || 'Desconocido'
            const region = data.region || 'Desconocida'
            const title = data.title || 'Sin título'

            const authorUsername =
                data.author?.username || 'Desconocido'

            const authorNickname =
                data.author?.nickname || 'Desconocido'

            const duration =
                data.duration !== undefined
                    ? `${data.duration}s`
                    : 'Desconocida'

            const repro = data.repro || '0'
            const like = data.like || '0'
            const share = data.share || '0'
            const comment = data.comment || '0'
            const download = data.download || '0'
            const published = data.published || 'Desconocida'

            const musicTitle =
                data.music?.title || 'Sin información'

            const musicAuthor =
                data.music?.author || 'Desconocido'

            const videoDataRef =
                media.find(item => item?.type === 'video')

            const sizeOrg = videoDataRef?.size_org
            const sizeHd = videoDataRef?.size_hd
            const sizeWm = videoDataRef?.size_wm

            let sizeInfo = ''

            if (videoDataRef) {
                if (hd && sizeHd) {
                    sizeInfo =
                        `✦ ━━ ᴘᴇꜱᴏ: ${sizeHd} (HD)\n`
                } else if (sizeOrg) {
                    sizeInfo =
                        `✦ ━━ ᴘᴇꜱᴏ: ${sizeOrg}\n`
                }
            }

            const caption =
` ✦ ━━━━━━━━━ ᴛɪᴋᴛᴏᴋ ━━━━━━━━━ ✦

✦ ━━ ᴛɪᴛᴜʟᴏ: ${title}
✦ ━━ ᴄʀᴇᴀᴅᴏʀ: ${authorNickname} / ${authorUsername}
✦ ━━ ɪᴅ: ${id}
✦ ━━ ʀᴇɢɪóɴ: ${region}
✦ ━━ ᴅᴜʀᴀᴄɪóɴ: ${duration}
${sizeInfo}✦ ━━ ᴠɪꜱᴛᴀꜱ: ${repro}
✦ ━━ ʟɪᴋᴇꜱ: ${like}
✦ ━━ ᴄᴏᴍᴘᴀʀᴛɪᴅᴏꜱ: ${share}
✦ ━━ ᴄᴏᴍᴇɴᴛᴀʀɪᴏꜱ: ${comment}
✦ ━━ ᴅᴇꜱᴄᴀʀɢᴀꜱ: ${download}
✦ ━━ ᴘᴜʙʟɪᴄᴀᴅᴏ: ${published}

✦ ━━━━━━━━━ ᴀᴜᴅɪᴏ ━━━━━━━━━ ✦

✦ ━━ ᴍᴜꜱɪᴄᴀ: ${musicTitle}
✦ ━━ ᴀᴜᴛᴏʀ: ${musicAuthor}`

            const photos = media.filter(
                item =>
                    item?.type === 'photo' ||
                    item?.type === 'image'
            )

            if (photos.length > 0) {

                for (let i = 0; i < photos.length; i++) {

                    const photo =
                        photos[i]?.url ||
                        photos[i]?.org ||
                        photos[i]?.hd

                    if (!photo) continue

                    await conn.sendMessage(
                        m.chat,
                        {
                            image: { url: photo },
                            caption: i === 0 ? caption : ''
                        },
                        { quoted: m }
                    )
                }

                if (typeof m.react === 'function') {
                    await m.react('✅')
                }

                return
            }

            const videoData = videoDataRef

            if (!videoData) {
                throw new Error(
                    'No se encontró el video en la respuesta de la API'
                )
            }

            let video
            let fileName = 'tiktok.mp4'

            if (hd) {

                if (!videoData.hd) {
                    console.log(
                        'La API no tiene HD. Usando versión normal.'
                    )
                }

                video =
                    videoData.hd ||
                    videoData.org ||
                    videoData.wm

                fileName =
                    videoData.hd
                        ? 'tiktok-hd.mp4'
                        : 'tiktok.mp4'

            } else {

                video =
                    videoData.org ||
                    videoData.wm ||
                    videoData.hd
            }

            if (!video) {
                throw new Error(
                    'La API no devolvió una URL válida del video'
                )
            }

            const videoResponse =
                await fetch(video, {
                    headers: nose
                })

            if (!videoResponse.ok) {
                throw new Error(
                    `No se pudo descargar el video: ${videoResponse.status}`
                )
            }

            const videoBuffer =
                Buffer.from(
                    await videoResponse.arrayBuffer()
                )

            tiktokCache.set(
                m.chat,
                {
                    video: videoBuffer,
                    title
                }
            )

            setTimeout(() => {
                tiktokCache.delete(m.chat)
            }, 10 * 60 * 1000)

            await conn.sendMessage(
                m.chat,
                {
                    video: videoBuffer,
                    mimetype: 'video/mp4',
                    fileName,
                    caption,
                    buttons: [
                        {
                            buttonId: '#tiktokaudio',
                            buttonText: {
                                displayText: '🎵 AUDIO'
                            },
                            type: 1
                        }
                    ],
                    headerType: 1,
                    ptv: false
                },
                { quoted: m }
            )

            if (typeof m.react === 'function') {
                await m.react('✅')
            }

        } catch (error) {

            console.error(
                'Pues error TikTok:',
                error
            )

            if (typeof m.react === 'function') {
                await m.react('❌')
            }

            return m.reply(
                `*Ocurrio un error*\n\n${error?.message || 'Error desconocido'}`
            )
        }
    }
  }
