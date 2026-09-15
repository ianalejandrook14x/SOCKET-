import { spawn } from 'child_process'

function runFFmpeg(input, args = []) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', 'pipe:0',
            ...args,
            'pipe:1'
        ])

        const chunks = []
        const errors = []

        ffmpeg.stdout.on('data', chunk => {
            chunks.push(chunk)
        })

        ffmpeg.stderr.on('data', chunk => {
            errors.push(chunk)
        })

        ffmpeg.on('error', error => {
            reject(error)
        })

        ffmpeg.on('close', code => {
            if (code !== 0) {
                return reject(
                    new Error(
                        Buffer.concat(errors).toString() ||
                        `FFmpeg terminó con código ${code}`
                    )
                )
            }

            resolve(Buffer.concat(chunks))
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

    const crf = options.crf ?? 28

    return await runFFmpeg(input, [
        '-map', '0:v:0',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', options.preset ?? 'medium',
        '-crf', String(crf),
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', options.audioBitrate ?? '96k',
        '-movflags', '+faststart',
        '-f', 'mp4'
    ])
      }
