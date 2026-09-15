import { spawn } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import crypto from 'crypto'

const DEFAULT_OPTIONS = {
    crf: 20,
    preset: 'veryfast',
    audioBitrate: '128k'
}

function createTempId() {
    return crypto.randomBytes(12).toString('hex')
}

function runProcess(command, args = []) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        })

        const stdout = []
        const stderr = []

        child.stdout.on('data', chunk => {
            stdout.push(chunk)
        })

        child.stderr.on('data', chunk => {
            stderr.push(chunk)
        })

        child.on('error', reject)

        child.on('close', (code, signal) => {
            const out = Buffer.concat(stdout).toString()
            const err = Buffer.concat(stderr).toString()

            if (code !== 0) {
                const signalText = signal ? ` (${signal})` : ''

                reject(
                    new Error(
                        `FFmpeg terminó con código ${code}${signalText}\n${err.trim() || out.trim()}`
                    )
                )

                return
            }

            resolve({
                stdout: out,
                stderr: err
            })
        })
    })
}

export async function checkFFmpeg() {
    await runProcess('ffmpeg', ['-version'])
    return true
}

export async function remuxVideo(input) {
    if (!Buffer.isBuffer(input)) {
        throw new TypeError('remuxVideo() necesita un Buffer')
    }

    if (!input.length) {
        throw new Error('remuxVideo() recibió un Buffer vacío')
    }

    const id = createTempId()

    const inputPath = path.join(
        os.tmpdir(),
        `wa-video-input-${id}.mp4`
    )

    const outputPath = path.join(
        os.tmpdir(),
        `wa-video-output-${id}.mp4`
    )

    try {
        await fs.writeFile(inputPath, input)

        await runProcess('ffmpeg', [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', inputPath,
            '-map', '0:v:0',
            '-map', '0:a?',
            '-c', 'copy',
            '-movflags', '+faststart',
            '-y',
            outputPath
        ])

        const output = await fs.readFile(outputPath)

        if (!output.length) {
            throw new Error('FFmpeg generó un archivo vacío')
        }

        return output
    } finally {
        await fs.rm(inputPath, { force: true }).catch(() => {})
        await fs.rm(outputPath, { force: true }).catch(() => {})
    }
}

export async function compressVideo(input, options = {}) {
    if (!Buffer.isBuffer(input)) {
        throw new TypeError('compressVideo() necesita un Buffer')
    }

    if (!input.length) {
        throw new Error('compressVideo() recibió un Buffer vacío')
    }

    const config = {
        ...DEFAULT_OPTIONS,
        ...options
    }

    const id = createTempId()

    const inputPath = path.join(
        os.tmpdir(),
        `compress-input-${id}.mp4`
    )

    const outputPath = path.join(
        os.tmpdir(),
        `compress-output-${id}.mp4`
    )

    try {
        await fs.writeFile(inputPath, input)

        await runProcess('ffmpeg', [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', inputPath,

            '-map', '0:v:0',
            '-map', '0:a?',

            '-c:v', 'libx264',
            '-crf', String(config.crf),
            '-preset', String(config.preset),
            '-pix_fmt', 'yuv420p',
            '-profile:v', 'high',

            '-c:a', 'aac',
            '-b:a', String(config.audioBitrate),

            '-movflags', '+faststart',

            '-y',
            outputPath
        ])

        const output = await fs.readFile(outputPath)

        if (!output.length) {
            throw new Error('FFmpeg generó un archivo vacío')
        }

        return output
    } finally {
        await fs.rm(inputPath, { force: true }).catch(() => {})
        await fs.rm(outputPath, { force: true }).catch(() => {})
    }
}

export async function probeVideo(input) {
    if (!Buffer.isBuffer(input)) {
        throw new TypeError('probeVideo() necesita un Buffer')
    }

    const id = createTempId()

    const inputPath = path.join(
        os.tmpdir(),
        `probe-input-${id}.mp4`
    )

    try {
        await fs.writeFile(inputPath, input)

        const result = await runProcess('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            inputPath
        ])

        return JSON.parse(result.stdout)
    } finally {
        await fs.rm(inputPath, { force: true }).catch(() => {})
    }
}

export async function isCompatibleVideo(input) {
    const info = await probeVideo(input)

    const video = info?.streams?.find(
        stream => stream.codec_type === 'video'
    )

    const audio = info?.streams?.find(
        stream => stream.codec_type === 'audio'
    )

    if (!video) {
        return false
    }

    const videoCodec = String(
        video.codec_name || ''
    ).toLowerCase()

    const pixelFormat = String(
        video.pix_fmt || ''
    ).toLowerCase()

    const audioCodec = String(
        audio?.codec_name || ''
    ).toLowerCase()

    return (
        videoCodec === 'h264' &&
        pixelFormat === 'yuv420p' &&
        (!audio || audioCodec === 'aac')
    )
}

export async function normalizeVideo(input, options = {}) {
    if (!Buffer.isBuffer(input)) {
        throw new TypeError('normalizeVideo() necesita un Buffer')
    }

    let compatible = false

    try {
        compatible = await isCompatibleVideo(input)
    } catch {
        compatible = false
    }

    if (compatible) {
        try {
            return await remuxVideo(input)
        } catch {}
    }

    return await compressVideo(input, {
        ...DEFAULT_OPTIONS,
        ...options
    })
}

export async function downloadVideo(url, options = {}) {
    if (
        typeof url !== 'string' ||
        !url.trim()
    ) {
        throw new TypeError(
            'downloadVideo() necesita una URL válida'
        )
    }

    const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(
            options.timeout || 120000
        )
    })

    if (!response.ok) {
        throw new Error(
            `No se pudo descargar el vídeo: HTTP ${response.status}`
        )
    }

    const contentLength =
        response.headers.get('content-length')

    if (
        options.maxSize &&
        contentLength &&
        Number(contentLength) > options.maxSize
    ) {
        throw new Error(
            'El vídeo supera el tamaño máximo permitido'
        )
    }

    const arrayBuffer =
        await response.arrayBuffer()

    const buffer =
        Buffer.from(arrayBuffer)

    if (!buffer.length) {
        throw new Error(
            'La descarga devolvió un archivo vacío'
        )
    }

    return buffer
}

export async function processVideoURL(url, options = {}) {
    const buffer = await downloadVideo(
        url,
        options
    )

    return await normalizeVideo(
        buffer,
        options
    )
}

export default {
    checkFFmpeg,
    remuxVideo,
    compressVideo,
    probeVideo,
    isCompatibleVideo,
    normalizeVideo,
    downloadVideo,
    processVideoURL
            }
