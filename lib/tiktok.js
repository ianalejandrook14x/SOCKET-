const TIKTOK_API = 'https://api.delirius.online/download/tiktok'

export function isTikTokUrl(text = '') {
    if (typeof text !== 'string') return false

    return /https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\S*/i.test(text)
}

export function extractTikTokUrl(text = '') {
    if (typeof text !== 'string') return null

    const match = text.match(
        /https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\S*/i
    )

    if (!match) return null

    return match[0].replace(/[),.!?;:'"]+$/g, '')
}

export function hasHD(text = '') {
    if (typeof text !== 'string') return false

    return /(?:^|\s)--hd(?:\s|$)/i.test(text)
}

export async function getTikTokData(url, hd = false) {
    if (!url) {
        throw new Error('No se proporcionó una URL de TikTok')
    }

    const params = new URLSearchParams({
        url
    })

    if (hd) {
        params.set('hd', 'true')
    }

    const endpoint = `${TIKTOK_API}?${params.toString()}`

    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0'
        }
    })

    const text = await response.text()

    let data

    try {
        data = JSON.parse(text)
    } catch {
        throw new Error(`La API respondió HTTP ${response.status}`)
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            `La API respondió HTTP ${response.status}`
        )
    }

    return data
}

function findVideoUrl(value, seen = new Set()) {
    if (!value || typeof value !== 'object') return null

    if (seen.has(value)) return null

    seen.add(value)

    if (Array.isArray(value)) {
        for (const item of value) {
            const result = findVideoUrl(item, seen)

            if (result) return result
        }

        return null
    }

    const preferredKeys = [
        'video',
        'videoUrl',
        'video_url',
        'download',
        'downloadUrl',
        'download_url',
        'nowm',
        'nowmUrl',
        'nowm_url',
        'play',
        'playUrl',
        'play_url',
        'url'
    ]

    for (const key of preferredKeys) {
        const current = value[key]

        if (
            typeof current === 'string' &&
            /^https?:\/\//i.test(current)
        ) {
            if (
                /\.(mp4|mov|webm)(?:[?#].*)?$/i.test(current) ||
                /video|mp4|download|play|nowm/i.test(current)
            ) {
                return current
            }
        }

        if (current && typeof current === 'object') {
            const result = findVideoUrl(current, seen)

            if (result) return result
        }
    }

    for (const current of Object.values(value)) {
        if (
            typeof current === 'string' &&
            /^https?:\/\//i.test(current) &&
            /\.(mp4|mov|webm)(?:[?#].*)?$/i.test(current)
        ) {
            return current
        }

        if (current && typeof current === 'object') {
            const result = findVideoUrl(current, seen)

            if (result) return result
        }
    }

    return null
}

export function getVideoUrl(data) {
    const videoUrl = findVideoUrl(data)

    if (!videoUrl) {
        throw new Error('La API no devolvió una URL de vídeo válida')
    }

    return videoUrl
}

export async function downloadTikTok(url, hd = false) {
    const data = await getTikTokData(url, hd)
    const videoUrl = getVideoUrl(data)

    const response = await fetch(videoUrl, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'video/mp4,video/*,*/*'
        }
    })

    if (!response.ok) {
        throw new Error(
            `No se pudo descargar el vídeo. HTTP ${response.status}`
        )
    }

    const arrayBuffer = await response.arrayBuffer()

    return {
        buffer: Buffer.from(arrayBuffer),
        url: videoUrl,
        data,
        hd
    }
}

export default {
    isTikTokUrl,
    extractTikTokUrl,
    hasHD,
    getTikTokData,
    getVideoUrl,
    downloadTikTok
      }
