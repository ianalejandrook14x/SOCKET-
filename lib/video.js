import { spawn } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import crypto from 'crypto'

function runFFmpegFile(input, output, args = []) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', 'pipe:0',
            ...args,
            output
        ])

        const errors = []

        ffmpeg.stderr.on('data', chunk => {
            errors.push(chunk)
        })

        ffmpeg.on('error', reject)

        ffmpeg.on('close', code => {
            if (code !== 0) {
                return reject(
                    new Error(
                        Buffer.concat(errors).toString() ||
                        `FFmpeg terminó con código ${code}`
                    )
                )
            }

            resolve()
        })

        ffmpeg.stdin.on('error', () => {})

        ffmpeg.stdin.end(input)
    })
}

export async function compressVideo(input, options = {}) {
    if (!Buffer.isBuffer(input)) {
        throw new TypeError(
            'compressVideo() necesita recibir un Buffer'
        )
    }

    const tempDir = os.tmpdir()

    const id = crypto.randomBytes(12).toString('hex')

    const inputPath = path.join(
        tempDir,
        `video-input-${id}.mp4`
    )

    const outputPath = path.join(
        tempDir,
        `video-output-${id}.mp4`
    )

    try {
        await fs.writeFile(inputPath, input)

        const crf = options.crf ?? 18
        const preset = options.preset ?? 'slow'
        const audioBitrate =
            options.audioBitrate ?? '128k'

        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-hide_banner',
                '-loglevel', 'error',

                '-i', inputPath,

                '-map', '0:v:0',
                '-map', '0:a?',

                '-c:v', 'libx264',
                '-preset', preset,
                '-crf', String(crf),

                '-pix_fmt', 'yuv420p',

                '-c:a', 'aac',
                '-b:a', audioBitrate,

                '-movflags', '+faststart',

                '-f', 'mp4',

                '-y',
                outputPath
            ])

            const errors = []

            ffmpeg.stderr.on('data', chunk => {
                errors.push(chunk)
            })

            ffmpeg.on('error', reject)

            ffmpeg.on('close', code => {
                if (code !== 0) {
                    reject(
                        new Error(
                            Buffer.concat(errors).toString() ||
                            `FFmpeg terminó con código ${code}`
                        )
                    )
                } else {
                    resolve()
                }
            })
        })

        const output = await fs.readFile(outputPath)

        return output

    } finally {
        await fs.rm(inputPath, {
            force: true
        }).catch(() => {})

        await fs.rm(outputPath, {
            force: true
        }).catch(() => {})
    }
        }
