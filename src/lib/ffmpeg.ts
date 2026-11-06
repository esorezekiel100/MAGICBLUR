import type { FFmpeg } from '@ffmpeg/ffmpeg'
import type { Operation } from './types'
import singleThreadCoreURL from '../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js?url'
import singleThreadWasmURL from '../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm?url'
import multiThreadCoreURL from '../../node_modules/@ffmpeg/core-mt/dist/umd/ffmpeg-core.js?url'
import multiThreadWasmURL from '../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm?url'
import multiThreadWorkerURL from '../../node_modules/@ffmpeg/core-mt/dist/umd/ffmpeg-core.worker.js?url'

type ExportOptions = {
  file: File
  extraFiles: File[]
  steps: Operation[]
  format: 'mp4' | 'webm' | 'mov' | 'mkv' | 'gif' | 'mp3'
  quality: string
  onProgress: (progress: number) => void
  onCancelReady: (cancel: () => void) => void
}

let ffmpegInstance: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null
let multithreadWorkerURL: string | null = null

function revokeMultithreadWorker() {
  if (multithreadWorkerURL) URL.revokeObjectURL(multithreadWorkerURL)
  multithreadWorkerURL = null
}

async function loadFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const isMultithread = window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined'
    const loadCore = async (instance: FFmpeg, multithread: boolean) => {
      if (!multithread) {
        await instance.load({ coreURL: singleThreadCoreURL, wasmURL: singleThreadWasmURL })
        return
      }

      const [coreResponse, workerResponse] = await Promise.all([
        fetch(multiThreadCoreURL),
        fetch(multiThreadWorkerURL),
      ])
      if (!coreResponse.ok || !workerResponse.ok) throw new Error('The local multithreaded video engine could not be loaded.')
      const [coreSource, workerSource] = await Promise.all([coreResponse.text(), workerResponse.text()])
      const workerImport = 'if(typeof e.data.urlOrBlob=="string"){importScripts(e.data.urlOrBlob)}else{var objectUrl=URL.createObjectURL(e.data.urlOrBlob);importScripts(objectUrl);URL.revokeObjectURL(objectUrl)}createFFmpegCore(Module)'
      if (!workerSource.includes(workerImport)) throw new Error('The local multithreaded worker could not be prepared.')
      const moduleCoreURL = URL.createObjectURL(new Blob(
        [coreSource, '\nexport default createFFmpegCore;'],
        { type: 'text/javascript' },
      ))
      const threadWorker = URL.createObjectURL(new Blob(
        [workerSource.replace(workerImport, `importScripts(${JSON.stringify(new URL(multiThreadCoreURL, window.location.href).href)});createFFmpegCore(Module)`)],
        { type: 'text/javascript' },
      ))
      try {
        await instance.load({
          coreURL: moduleCoreURL,
          wasmURL: multiThreadWasmURL,
          workerURL: threadWorker,
        })
        multithreadWorkerURL = threadWorker
      } catch (error) {
        URL.revokeObjectURL(threadWorker)
        throw error
      } finally {
        URL.revokeObjectURL(moduleCoreURL)
      }
    }
    let ffmpeg = new FFmpeg()
    try { await loadCore(ffmpeg, isMultithread) }
    catch (error) {
      if (!isMultithread) throw error
      ffmpeg.terminate()
      revokeMultithreadWorker()
      ffmpeg = new FFmpeg()
      await loadCore(ffmpeg, false)
    }
    ffmpegInstance = ffmpeg
    return ffmpeg
  })()
  try { return await loadPromise }
  catch (error) {
    loadPromise = null
    const detail = error instanceof Error && error.message ? error.message : String(error)
    throw new Error(`The local video engine could not load. Try again or choose a smaller clip. ${detail}`)
  }
}

async function createSampleFrame() {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not draw the sample video in this browser.')
  const sky = context.createLinearGradient(0, 0, 0, canvas.height)
  sky.addColorStop(0, '#7776b7')
  sky.addColorStop(0.52, '#e79d9a')
  sky.addColorStop(1, '#f3c397')
  context.fillStyle = sky
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#ffe2ad'
  context.beginPath()
  context.arc(480, 115, 36, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#4f638f'
  context.beginPath()
  context.moveTo(0, 235)
  context.bezierCurveTo(100, 145, 210, 170, 315, 217)
  context.bezierCurveTo(425, 267, 515, 155, 640, 210)
  context.lineTo(640, 360)
  context.lineTo(0, 360)
  context.fill()
  context.fillStyle = '#34545e'
  context.beginPath()
  context.moveTo(0, 296)
  context.bezierCurveTo(130, 247, 215, 307, 344, 316)
  context.bezierCurveTo(470, 328, 532, 264, 640, 304)
  context.lineTo(640, 360)
  context.lineTo(0, 360)
  context.fill()
  context.fillStyle = 'rgba(255,255,255,.82)'
  context.font = '600 13px system-ui, sans-serif'
  context.fillText('A LITTLE CREATIVE BREAK', 32, 45)
  context.font = '600 34px system-ui, sans-serif'
  context.fillStyle = '#fff'
  context.fillText('Your next idea,', 32, 130)
  context.fillText('in motion.', 32, 171)
  context.font = '14px system-ui, sans-serif'
  context.fillStyle = 'rgba(255,255,255,.82)'
  context.fillText('A sample made right here in your browser.', 34, 207)
  const frame = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!frame) throw new Error('Could not create the sample video frame.')
  return new Uint8Array(await frame.arrayBuffer())
}

export async function createSampleVideo(): Promise<File> {
  const ffmpeg = await loadFfmpeg()
  const imagePath = '/magicblur-sample.png'
  const videoPath = '/magicblur-sample.mp4'
  try {
    await ffmpeg.writeFile(imagePath, await createSampleFrame())
    const result = await ffmpeg.exec([
      '-y', '-loop', '1', '-framerate', '24', '-i', imagePath,
      '-vf', "zoompan=z='min(zoom+0.0005\\,1.08)':d=1:s=640x360:fps=24,format=yuv420p",
      '-t', '10', '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30',
      '-movflags', '+faststart', videoPath,
    ])
    if (result !== 0) throw new Error('The sample video could not be generated. Try choosing a video from your device.')
    const data = await ffmpeg.readFile(videoPath)
    if (typeof data === 'string') throw new Error('The sample video could not be read. Try choosing a video from your device.')
    return new File([new Uint8Array(data)], 'magicblur-sample.mp4', { type: 'video/mp4' })
  } finally {
    for (const path of [imagePath, videoPath]) {
      try { await ffmpeg.deleteFile(path) } catch { /* The output may not exist when generation fails. */ }
    }
  }
}

function safeFilename(name: string) {
  return name.replace(/[^\w.-]+/g, '_')
}

function filterFor(step: Operation) {
  const value = (key: string, fallback: number) => Number(step.values[key] ?? fallback)
  switch (step.kind) {
    case 'rotate': {
      const degrees = value('degrees', 90)
      if (degrees === 90) return 'transpose=1'
      if (degrees === 270) return 'transpose=2'
      return 'hflip,vflip'
    }
    case 'flip': return value('horizontal', 1) ? 'hflip' : 'vflip'
    case 'crop': {
      const ratio = Math.min(1, Math.max(0.2, value('ratio', 0.8)))
      return `crop=trunc(iw*${ratio}/2)*2:trunc(ih*${ratio}/2)*2:(iw-ow)/2:(ih-oh)/2`
    }
    case 'resize': {
      const width = Math.max(2, Math.floor(value('width', 1280) / 2) * 2)
      const height = Math.max(2, Math.floor(value('height', 720) / 2) * 2)
      return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
    }
    case 'speed': return `setpts=${1 / Math.min(4, Math.max(0.25, value('speed', 1)))}*PTS`
    case 'volume': return `volume=${Math.min(2, Math.max(0, value('volume', 1)))}`
    default: return ''
  }
}

export async function exportVideo(options: ExportOptions): Promise<File> {
  const { file, extraFiles, steps, format, quality, onProgress, onCancelReady } = options
  const ffmpeg = await loadFfmpeg()
  let cancelled = false
  const cleanup = () => { ffmpeg.off('progress', onFfmpegProgress) }
  const onFfmpegProgress = ({ progress }: { progress: number }) => onProgress(Math.max(0, Math.min(1, progress || 0)))
  ffmpeg.on('progress', onFfmpegProgress)
  onCancelReady(() => {
    cancelled = true
    ffmpeg.terminate()
    revokeMultithreadWorker()
    ffmpegInstance = null
    loadPromise = null
  })

  const files = [file, ...extraFiles]
  const inputs = files.map((item, index) => `/input_${index}_${safeFilename(item.name)}`)
  const output = `/magicblur-output.${format}`
  try {
    for (const [index, item] of files.entries()) {
      if (cancelled) throw new DOMException('Export cancelled', 'AbortError')
      await ffmpeg.writeFile(inputs[index], new Uint8Array(await item.arrayBuffer()))
    }
    if (cancelled) throw new DOMException('Export cancelled', 'AbortError')

    const trim = steps.find(step => step.kind === 'trim')
    const mergeRequested = steps.some(step => step.kind === 'merge') && files.length > 1
    let args: string[]
    if (mergeRequested) {
      const manifest = new TextEncoder().encode(inputs.map(input => `file '${input}'`).join('\n'))
      await ffmpeg.writeFile('/magicblur-inputs.txt', manifest)
      args = ['-y', '-f', 'concat', '-safe', '0', '-i', '/magicblur-inputs.txt']
    } else {
      const loops = steps.filter(step => step.kind === 'loop').reduce((count, step) => count + Math.max(0, Number(step.values.loops) || 1), 0)
      args = ['-y', ...(loops ? ['-stream_loop', `${loops}`] : []), ...inputs.flatMap(input => ['-i', input])]
    }
    if (trim) {
      const start = Math.max(0, Number(trim.values.start) || 0)
      const end = Math.max(start, Number(trim.values.end) || 0)
      args.push('-ss', `${start}`, '-t', `${Math.max(0.01, end - start)}`)
    }

    const videoFilters = steps.map(filterFor).filter(Boolean)
    if (format === 'gif') videoFilters.push('fps=12', 'scale=720:-1:flags=lanczos')
    const speed = steps.filter(step => step.kind === 'speed').reduce((result, step) => result / Math.min(4, Math.max(0.25, Number(step.values.speed) || 1)), 1)
    const volume = steps.filter(step => step.kind === 'volume').reduce((result, step) => result * Math.min(2, Math.max(0, Number(step.values.volume) || 0)), 1)
    const argsBeforeOutput: string[] = []

    if (mergeRequested) {
      if (videoFilters.length) argsBeforeOutput.push('-vf', videoFilters.join(','))
      argsBeforeOutput.push('-map', '0:v:0')
      if (format !== 'mp3') argsBeforeOutput.push('-map', '0:a:0?')
    } else {
      if (videoFilters.length) argsBeforeOutput.push('-vf', videoFilters.join(','))
      if (format !== 'mp3') argsBeforeOutput.push('-map', '0:v:0')
    }
    if (format !== 'mp3' && (steps.some(step => step.kind === 'speed') || steps.some(step => step.kind === 'volume'))) {
      const audioFilters = [
        ...(speed !== 1 ? [`atempo=${Math.min(2, speed)}`, ...(speed > 2 ? [`atempo=${speed / 2}`] : [])] : []),
        ...(steps.some(step => step.kind === 'volume') ? [`volume=${volume}`] : []),
      ]
      if (audioFilters.length) argsBeforeOutput.push('-af', audioFilters.join(','))
    }
    if (!mergeRequested) {
      if (files.length > 1 && steps.some(step => step.kind === 'audio')) argsBeforeOutput.push('-map', '1:a:0?')
      else if (format !== 'mp3') argsBeforeOutput.push('-map', '0:a:0?')
    }

    if (format === 'mp3') argsBeforeOutput.push('-vn', '-map', '0:a:0?', '-c:a', 'libmp3lame', '-b:a', '192k')
    else if (format === 'webm') argsBeforeOutput.push('-c:v', 'libvpx-vp9', '-crf', quality === 'low' ? '38' : '32', '-b:v', '0', '-c:a', 'libopus')
    else if (format === 'gif') argsBeforeOutput.push('-loop', '0')
    else {
      argsBeforeOutput.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', quality === 'low' ? '30' : quality === 'balanced' ? '26' : '23', '-c:a', 'aac')
      if (format !== 'mkv') argsBeforeOutput.push('-movflags', '+faststart')
    }

    const result = await ffmpeg.exec([...args, ...argsBeforeOutput, output])
    if (cancelled) throw new DOMException('Export cancelled', 'AbortError')
    if (result !== 0) throw new Error('The video could not be exported. Try a shorter clip, a smaller resolution or a different format.')
    const data = await ffmpeg.readFile(output)
    if (typeof data === 'string') throw new Error('The exported file is not available. Please try again.')
    onProgress(1)
    return new File([new Uint8Array(data)], `magicblur-${safeFilename(file.name.replace(/\.[^.]+$/, ''))}.${format}`, { type: format === 'mp4' ? 'video/mp4' : format === 'mov' ? 'video/quicktime' : format === 'mkv' ? 'video/x-matroska' : format === 'webm' ? 'video/webm' : format === 'gif' ? 'image/gif' : 'audio/mpeg' })
  } catch (error) {
    if (cancelled) throw new DOMException('Export cancelled', 'AbortError')
    throw error
  } finally {
    cleanup()
    for (const filename of [...inputs, output]) {
      try { await ffmpeg.deleteFile(filename) } catch { /* The worker may have been terminated during cancellation. */ }
    }
  }
}
