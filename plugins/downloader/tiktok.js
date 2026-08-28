const TIKTOK_API = 'https://api.delirius.online/download/tiktok'

export default {
    command: [
        'Tiktok',
        'tt',
        'tiktok',
        'tik'
    ],

    async run(m, { conn, args }) {
        if (!args || args.length === 0) {
            return m.reply(
                'TYPAH | ☁'
            )
        }

        const url = args.join(' ').trim()

        if (
            !url.includes('tiktok.com') &&
            !url.includes('vm.tiktok.com') &&
            !url.includes('vt.tiktok.com')
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
                                    ? 'TYPAH | ☁'
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

            const video =
                videoData.hd ||
                videoData.org ||
                videoData.wm

            if (!video) {
                throw new Error(
                    'La API no devolvió una URL válida del video'
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
                    fileName: 'tiktok.mp4',
                    caption: 'TYPAH | ☁',
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
