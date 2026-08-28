const TIKTOK_API = 'https://api.delirius.online/download/tiktok'

export default {
    command: [
        'sg'
    ],

    async run(m, { conn, args }) {
        if (!args || args.length === 0) {
            return m.reply(
                '*Downloader | Tiktok*\n *Uso:*\n\n*#tiktok https://vt.tiktok.com/xxxxx*\n*#tiktok https://vt.tiktok.com/xxxxx --hd* | HD Quality'
            )
        }

        const hd = args.includes('--hd')

        const url = args
            .filter(arg => arg !== '--hd')
            .join(' ')
            .trim()

        if (!url) {
            return m.reply('*Uso correcto:*\n\n> *#tiktok https://vt.tiktok.com/xxxxx --hd*')
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
                throw new Error('La API no devolvió resultado')
            }

            const data = json.data

            if (!data) {
                throw new Error('La API no tiene respuesta del contenido')
            }

            const media =
                data.meta?.media || []

            if (!Array.isArray(media) || media.length === 0) {
                throw new Error(
                    'La API no devolvió ningún archivo'
                )
            }

            const title =
                data.title ||
                'Sin título'

            const authorUsername =
                data.author?.username ||
                'Desconocido'

            const authorNickname =
                data.author?.nickname ||
                'Desconocido'

            const duration =
                data.duration !== undefined
                    ? `${data.duration}s`
                    : 'Desconocida'

            const repro =
                data.repro ||
                '0'

            const like =
                data.like ||
                '0'

            const share =
                data.share ||
                '0'

            const comment =
                data.comment ||
                '0'

            const published =
                data.published ||
                'Desconocida'

            const musicTitle =
                data.music?.title ||
                'Sin información'

            const musicAuthor =
                data.music?.author ||
                'Desconocido'

            const caption =
                `
✦ ━━━━━━━━━━ ᴛɪᴋᴛᴏᴋ ━━━━━━━━━━ ✦

✦ ━━━ ᴛɪᴛᴜʟᴏ: ${title}
✦ ━━━ ᴄʀᴇᴀᴅᴏʀ: ${authorNickname} / ${authorUsername}
✦ ━━━ ᴅᴜʀᴀᴄɪóɴ: ${duration}
✦ ━━━ ᴠɪꜱᴛᴀꜱ: ${repro}
✦ ━━━ ʟɪᴋᴇꜱ: ${like}
✦ ━━━ ᴄᴏᴍᴘᴀʀᴛɪᴅᴏꜱ: ${share}
✦ ━━━ ᴄᴏᴍᴇɴᴛᴀʀɪᴏꜱ: ${comment}
✦ ━━━ ᴘᴜʙʟɪᴄᴀᴅᴏ: ${published}

✦ ━━━━━━━━━━ ᴀᴜᴅɪᴏ ━━━━━━━━━━ ✦

✦ ━━━ ᴍᴜꜱɪᴄᴀ: ${musicTitle}
✦ ━━━ ᴀᴜᴛᴏʀ: ${musicAuthor}`

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
                            image: {
                                url: photo
                            },
                            caption:
                                i === 0
                                    ? caption
                                    : ''
                        },
                        {
                            quoted: m
                        }
                    )
                }

                if (typeof m.react === 'function') {
                    await m.react('✅')
                }

                return
            }

            const videoData =
                media.find(
                    item =>
                        item?.type === 'video'
                )

            if (!videoData) {
                throw new Error(
                    'No se encontró el video en la respuesta de la API'
                )
            }

            const video = hd
                ? (
                    videoData.hd ||
                    videoData.org ||
                    videoData.wm
                )
                : (
                    videoData.org ||
                    videoData.wm ||
                    videoData.hd
                )

            if (!video) {
                throw new Error(
                    hd
                        ? 'La API no devolvió una URL HD válida del video'
                        : 'La API no devolvió una URL válida del video'
                )
            }

            const videoResponse = await fetch(video)

            if (!videoResponse.ok) {
                throw new Error(
                    `No se pudo descargar el video: ${videoResponse.status}`
                )
            }

            const videoBuffer = Buffer.from(
                await videoResponse.arrayBuffer()
            )

            await conn.sendMessage(
                m.chat,
                {
                    video: videoBuffer,
                    mimetype: 'video/mp4',
                    fileName: hd
                        ? 'tiktok-hd.mp4'
                        : 'tiktok.mp4',
                    caption: caption,
                    ptv: false
                },
                {
                    quoted: m
                }
            )

            if (typeof m.react === 'function') {
                await m.react('✅')
            }

        } catch (error) {
            console.error(
                'API false',
                error
            )

            if (typeof m.react === 'function') {
                await m.react('❌')
            }

            return m.reply(
                '*Ocurrio un error*\n\n' +
                `${error?.message || 'Error desconocido'}`
            )
        }
    }
}
