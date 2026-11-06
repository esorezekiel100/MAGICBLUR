import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDown, ArrowDownUp, ArrowLeftRight, ArrowRight, ArrowUp, AudioLines, BadgeCheck,
  Check, ChevronDown, CircleHelp, Clapperboard, Clock3, CloudOff, Crop, Download,
  FileVideo2, Film, FlipHorizontal, FlipVertical, Gauge, Globe2, HardDrive,
  ImagePlus, Languages, LockKeyhole, Menu, Moon, MoveRight, Play, RotateCw,
  Scissors, ShieldCheck, Sparkles, Sun, Upload, Volume2, X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { exportVideo } from './lib/ffmpeg'
import { createDemoVideo } from './lib/demo'
import { clearSession, loadSession, saveSession } from './lib/session-store'
import { conversionTargets, languages, tools, type ConversionTarget, type Tool } from './lib/tools'
import type { Operation, OperationKind } from './lib/types'
import { Slider } from './components/ui/slider'
import { Button } from './components/ui/button'
import './App.css'

type ExportFormat = 'mp4' | 'webm' | 'mov' | 'mkv' | 'gif' | 'mp3'

const operationIcons: Record<OperationKind, typeof Scissors> = {
  trim: Scissors, crop: Crop, rotate: RotateCw, flip: FlipHorizontal, resize: ArrowDownUp,
  speed: Gauge, volume: Volume2, loop: Play, merge: Film, convert: FileVideo2, gif: ImagePlus, audio: AudioLines,
}

function App() {
  return <BrowserRouter><MagicBlur /></BrowserRouter>
}

function MagicBlur() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [file, setFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState('')
  const [extras, setExtras] = useState<File[]>([])
  const [steps, setSteps] = useState<Operation[]>([])
  const [history, setHistory] = useState<Operation[][]>([])
  const [future, setFuture] = useState<Operation[][]>([])
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4')
  const [quality, setQuality] = useState('high')
  const [progress, setProgress] = useState<number | null>(null)
  const [exportedUrl, setExportedUrl] = useState('')
  const [exportedName, setExportedName] = useState('')
  const [error, setError] = useState('')
  const [sessionMessage, setSessionMessage] = useState('')
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 })
  const [demoLoading, setDemoLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [isIsolated] = useState(() => window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined')
  const videoRef = useRef<HTMLVideoElement>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  const videoUrlRef = useRef('')
  const outputUrlRef = useRef('')
  const initialRouteRef = useRef(location.pathname)
  const pwa = useRegisterSW({
    immediate: true,
    onRegisterError: reason => setError(`Offline updates could not be installed: ${reason instanceof Error ? reason.message : String(reason)}`),
  })
  const [needRefresh, setNeedRefresh] = pwa.needRefresh
  const [offlineReady, setOfflineReady] = pwa.offlineReady
  const updateServiceWorker = pwa.updateServiceWorker
  const updateExportFormat = useCallback((format: ExportFormat) => {
    setExportFormat(format)
    setExportedUrl('')
    setExportedName('')
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
    outputUrlRef.current = ''
  }, [])
  const updateQuality = useCallback((value: string) => {
    setQuality(value)
    setExportedUrl('')
    setExportedName('')
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
    outputUrlRef.current = ''
  }, [])
  const closeNavigationMenus = (event: MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.closest('nav')?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(details => details.removeAttribute('open'))
    setMenuOpen(false)
  }

  useEffect(() => {
    void loadSession()
      .then(saved => {
        if (saved?.file instanceof File) {
          videoUrlRef.current = URL.createObjectURL(saved.file)
          setObjectUrl(videoUrlRef.current)
          setFile(saved.file)
          setExtras(saved.extras ?? [])
          setSteps(saved.steps ?? [])
          setExportFormat(saved.exportFormat as ExportFormat)
          setQuality(saved.quality || 'high')
          navigate(initialRouteRef.current.startsWith('/convert/') || tools.some(tool => `/${tool.slug}` === initialRouteRef.current) ? initialRouteRef.current : '/trim')
          setSessionMessage('Your last edit was restored from this browser.')
        }
        setSessionLoaded(true)
      })
      .catch(reason => {
        setSessionMessage(reason instanceof Error ? reason.message : 'Local session could not be restored.')
        setSessionLoaded(true)
      })
  }, [navigate])

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  useEffect(() => {
    if (!sessionLoaded) return
    if (!file) {
      void clearSession().catch(reason => {
        setSessionMessage(reason instanceof Error ? reason.message : 'Could not clear the local session.')
      })
      return
    }
    const timer = window.setTimeout(() => {
      void saveSession({
        file,
        extras,
        steps,
        exportFormat,
        quality,
        updatedAt: Date.now(),
      }).then(() => setSessionMessage('Edit saved only in this browser.'))
        .catch(reason => setSessionMessage(reason instanceof Error ? reason.message : 'Your edit could not be saved locally.'))
    }, 500)
    return () => window.clearTimeout(timer)
  }, [file, extras, steps, exportFormat, quality, sessionLoaded])

  useEffect(() => {
    document.documentElement.lang = i18n.language
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
  }, [i18n.language])

  useEffect(() => {
    const slug = location.pathname === '/' ? '' : location.pathname.split('/').filter(Boolean).pop() ?? ''
    const pageTool = tools.find(item => item.slug === slug)
    const conversionTarget = location.pathname.startsWith('/convert/') ? conversionTargets.find(item => item.slug === slug) : undefined
    const title = conversionTarget ? `${conversionTarget.name} Video Converter Online, Free & Private | MAGICBLUR` : pageTool ? `${pageTool.name} Video Online, Free & Private | MAGICBLUR` : slug === 'privacy' ? 'How Privacy Works | MAGICBLUR' : slug === 'pricing' ? 'Simple Video Editing Plans | MAGICBLUR' : 'MAGICBLUR — Edit video. Keep it yours.'
    document.title = title
    const description = conversionTarget?.description ?? (pageTool ? pageTool.description : 'Edit, trim, crop and convert videos right in your browser. Your video never leaves your device.')
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
    let og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
    if (!og) {
      og = document.createElement('meta')
      og.setAttribute('property', 'og:title')
      document.head.appendChild(og)
    }
    og.content = title
  }, [location.pathname])

  useEffect(() => () => {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
  }, [])

  const recordSteps = useCallback((next: Operation[]) => {
    setHistory(previous => [...previous, steps])
    setFuture([])
    setSteps(next)
    setExportedUrl('')
  }, [steps])

  const acceptFile = useCallback((nextFile: File) => {
    if (!nextFile.type.startsWith('video/') && !/\.(mp4|mov|webm|mkv|avi|m4v|mpeg|mpg)$/i.test(nextFile.name)) {
      setError('Choose a video file to get started.')
      return
    }
    if (nextFile.size > 2 * 1024 * 1024 * 1024) {
      setError('This file is over the 2 GB browser limit. Try a shorter clip or a desktop browser.')
      return
    }
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
    videoUrlRef.current = URL.createObjectURL(nextFile)
    outputUrlRef.current = ''
    setObjectUrl(videoUrlRef.current)
    setFile(nextFile)
    setDuration(0)
    setCurrentTime(0)
    setVideoDimensions({ width: 0, height: 0 })
    setExtras([])
    setSteps([])
    setHistory([])
    setFuture([])
    setExportedUrl('')
    setError('')
    const route = location.pathname.startsWith('/convert/')
      ? location.pathname
      : tools.some(tool => `/${tool.slug}` === location.pathname)
        ? location.pathname
        : '/trim'
    navigate(route)
  }, [location.pathname, navigate])

  const importFromUrl = async (value: string) => {
    let url: URL
    try { url = new URL(value) }
    catch { setError('Enter a valid direct video URL.'); return }
    if (!['http:', 'https:'].includes(url.protocol)) {
      setError('Use an HTTP or HTTPS link to a video file.')
      return
    }
    try {
      setError('')
      setSessionMessage('')
      const response = await fetch(url)
      if (!response.ok) throw new Error('The link did not return a video file.')
      const contentLength = Number(response.headers.get('content-length'))
      if (contentLength > 2 * 1024 * 1024 * 1024) {
        setError('This video is over the 2 GB browser limit. Try a shorter clip or a desktop browser.')
        return
      }
      const blob = await response.blob()
      const pathname = decodeURIComponent(url.pathname)
      const name = pathname.split('/').pop() || 'magicblur-video.mp4'
      const type = blob.type.startsWith('video/') ? blob.type : 'video/mp4'
      acceptFile(new File([blob], name, { type }))
    } catch {
      setError('This link could not be opened directly. Try a public video file link that allows browser access, or choose the file from your device.')
    }
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (selected) acceptFile(selected)
    event.target.value = ''
  }
  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const selected = event.dataTransfer.files[0]
    if (selected) acceptFile(selected)
  }

  const forgetSavedSession = async () => {
    try {
      await clearSession()
      setSessionMessage('The saved edit was removed from this device.')
    } catch (reason) {
      setSessionMessage(reason instanceof Error ? reason.message : 'The saved edit could not be removed.')
    }
  }

  const loadDemo = async () => {
    setDemoLoading(true)
    setError('')
    try { acceptFile(await createDemoVideo()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the sample video in this browser.') }
    finally { setDemoLoading(false) }
  }

  const addOperation = (kind: OperationKind, label: string, detail: string, values: Record<string, number | string> = {}) => {
    recordSteps([...steps, { id: crypto.randomUUID(), kind, label, detail, values }])
    setError('')
  }

  const undo = () => {
    const previous = history.at(-1)
    if (!previous) return
    setFuture(items => [steps, ...items])
    setSteps(previous)
    setHistory(items => items.slice(0, -1))
  }
  const redo = () => {
    const next = future[0]
    if (!next) return
    setHistory(items => [...items, steps])
    setSteps(next)
    setFuture(items => items.slice(1))
  }

  const startExport = async () => {
    if (!file) return
    setWorking(true)
    setProgress(0)
    setError('')
    setExportedUrl('')
    try {
      const output = await exportVideo({
        file, extraFiles: extras, steps, format: exportFormat,
        quality, onProgress: setProgress,
        onCancelReady: cancel => { cancelRef.current = cancel },
      })
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
      outputUrlRef.current = URL.createObjectURL(output)
      setExportedUrl(outputUrlRef.current)
      setExportedName(output.name)
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : 'Export failed. Try a shorter clip or a different format.')
      }
    } finally {
      setProgress(null)
      setWorking(false)
      cancelRef.current = null
    }
  }

  const editorProps = {
    file: file!,
    objectUrl,
    videoRef,
    steps,
    extras,
    setExtras,
    recordSteps,
    addOperation,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    sessionMessage,
    clearSavedSession: forgetSavedSession,
    onFileChange,
    onDrop,
    duration,
    setDuration,
    videoDimensions,
    setVideoDimensions,
    currentTime,
    setCurrentTime,
    exportFormat,
    setExportFormat: updateExportFormat,
    quality,
    setQuality: updateQuality,
    startExport,
    working,
    progress,
    cancel: () => cancelRef.current?.(),
    exportedUrl,
    exportedName,
    error,
    setError,
    isIsolated,
  }

  return (
    <div className={`app ${darkMode ? 'theme-dark' : ''}`} onDragOver={event => event.preventDefault()} onDrop={onDrop}>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="MAGICBLUR home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span>magic<span className="brand-violet">blur</span></span>
        </Link>
        <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          <details className="nav-dropdown">
            <summary>{t('nav.tools')} <ChevronDown size={14} /></summary>
            <div className="nav-dropdown-menu">
              {(['Privacy', 'Edit', 'Combine'] as const).map(category => (
                <div className="nav-dropdown-group" key={category}>
                  <span>{category}</span>
                  {tools.filter(tool => tool.group === category).map(tool => (
                    <Link key={tool.slug} to={`/${tool.slug}`} onClick={closeNavigationMenus}>{tool.name}<ArrowRight size={12} /></Link>
                  ))}
                </div>
              ))}
            </div>
          </details>
          <details className="nav-dropdown">
            <summary>{t('nav.convert')} <ChevronDown size={14} /></summary>
            <div className="nav-dropdown-menu">
              {(['Video', 'Audio', 'Creative', 'Social'] as const).map(category => (
                <div className="nav-dropdown-group" key={category}>
                  <span>{category === 'Creative' ? 'GIF & creative' : category === 'Social' ? 'Social media' : `${category} formats`}</span>
                  {conversionTargets.filter(target => target.category === category).map(target => (
                    <Link key={target.slug} to={`/convert/${target.slug}`} onClick={closeNavigationMenus}>{target.name}<ArrowRight size={12} /></Link>
                  ))}
                </div>
              ))}
              <Link className="dropdown-all-tools" to="/convert" onClick={closeNavigationMenus}>All conversion tools <ArrowRight size={13} /></Link>
            </div>
          </details>
          <Link to="/pricing" onClick={closeNavigationMenus}>{t('nav.pricing')}</Link>
          <Link to="/privacy" onClick={closeNavigationMenus}>{t('nav.privacy')}</Link>
          <Link className="nav-mobile-cta" to="/#upload" onClick={closeNavigationMenus}>{t('nav.start')}</Link>
        </nav>
        <div className="top-actions">
          <button className="icon-button theme-toggle" onClick={() => setDarkMode(value => !value)} aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link className="button button-dark nav-cta" to="/#upload">{t('nav.start')} <ArrowRight size={16} /></Link>
          <button className="icon-button menu-toggle" onClick={() => setMenuOpen(value => !value)} aria-label="Toggle navigation">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>
      {(needRefresh || offlineReady || !isOnline) && <div className="pwa-banner" role="status">
        <span className="pwa-banner-icon">{!isOnline ? <CloudOff size={16} /> : <Sparkles size={16} />}</span>
        <span className="pwa-banner-copy"><b>{needRefresh ? 'A new MAGICBLUR update is ready.' : !isOnline ? 'You’re offline. Your videos stay on this device.' : 'MAGICBLUR is ready to open offline.'}</b><small>{needRefresh ? 'Install the update to use the latest editor.' : 'FFmpeg tools are available offline after their first load.'}</small></span>
        {needRefresh && <button className="pwa-banner-action" onClick={() => void updateServiceWorker(true)}>Update</button>}
        <button className="pwa-banner-close" aria-label="Dismiss update notice" onClick={() => { setOfflineReady(false); setNeedRefresh(false) }}><X size={15} /></button>
      </div>}

      <main>
        <Routes>
          <Route path="/" element={file
            ? <EditorPage tool={tools.find(item => item.slug === 'trim')!} {...editorProps} />
            : <HomePage onFileChange={onFileChange} onDrop={onDrop} loadDemo={loadDemo} demoLoading={demoLoading} error={error} importFromUrl={importFromUrl} />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/convert" element={<ConversionIndexPage uploadProps={{ onFileChange, onDrop, loadDemo, demoLoading, error, importFromUrl }} />} />
          {conversionTargets.map(target => <Route key={target.slug} path={`/convert/${target.slug}`} element={<ConversionPage target={target} editor={file ? <EditorPage tool={tools.find(item => item.slug === 'convert')!} {...editorProps} /> : null} uploadProps={{ onFileChange, onDrop, loadDemo, demoLoading, error, importFromUrl }} setExportFormat={updateExportFormat} />} />)}
          {tools.map(tool => <Route key={tool.slug} path={`/${tool.slug}`} element={file
            ? <EditorPage tool={tool} {...editorProps} />
            : <ToolLanding tool={tool} onFileChange={onFileChange} onDrop={onDrop} loadDemo={loadDemo} demoLoading={demoLoading} error={error} importFromUrl={importFromUrl} />} />)}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <Link className="brand footer-brand" to="/"><span className="brand-mark"><span /><span /><span /></span><span>magic<span className="brand-violet">blur</span></span></Link>
          <span className="footer-promise"><LockKeyhole size={14} /> {t('privacy.badge')}</span>
          <label className="language-select"><Languages size={15} /><span className="sr-only">Language</span>
            <select value={i18n.language} onChange={event => i18n.changeLanguage(event.target.value)} aria-label="Select language">
              {languages.map(language => <option key={language.code} value={language.code}>{language.label}</option>)}
            </select><ChevronDown size={13} />
          </label>
        </div>
        <div className="footer-bottom">
          <span>© 2026 MAGICBLUR. Your videos stay yours.</span>
          <div><Link to="/privacy">Privacy</Link><Link to="/pricing">Pricing</Link></div>
        </div>
      </footer>
    </div>
  )
}

type UploadProps = { onFileChange: (event: ChangeEvent<HTMLInputElement>) => void; onDrop: (event: DragEvent<HTMLElement>) => void; loadDemo: () => void; demoLoading: boolean; error: string; importFromUrl: (url: string) => Promise<void>; compact?: boolean; heroScene?: boolean }

function UploadZone({ onFileChange, onDrop, loadDemo, demoLoading, error, importFromUrl, compact = false, heroScene = false }: UploadProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const submitUrl = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUrlLoading(true)
    await importFromUrl(url)
    setUrlLoading(false)
  }
  return (
    <section className={`upload-zone ${compact ? 'upload-compact' : ''} ${heroScene ? 'upload-hero' : ''}`} id="upload" onDragOver={event => event.preventDefault()} onDrop={onDrop}>
      <div className="upload-privacy"><LockKeyhole size={13} /> {t('privacy.badge')}</div>
      {heroScene && <div className="hero-scene"><img src="/hero-frame.svg" alt="Illustrated sunset hills in a video preview" /><span className="scene-kicker"><span /> SAMPLE FRAME · MADE IN YOUR BROWSER</span><span className="scene-time">00:08 <i /></span><span className="scene-caption">A moment in motion.</span><span className="scene-shine" /></div>}
      <div className="upload-icon"><Upload size={23} strokeWidth={1.8} /></div>
      <h2>{compact ? 'Bring your video into the editor' : 'Drop a video. Make it yours.'}</h2>
      <p>Drag and drop your file here, or choose one from your device.</p>
      <label className="button button-primary upload-button"><Upload size={16} /> Choose a video
        <input type="file" accept="video/*,.mkv,.mov,.webm" onChange={onFileChange} aria-label="Choose a video file" />
      </label>
      <div className="upload-or"><span /> or <span /></div>
      <button className="sample-link" type="button" onClick={loadDemo} disabled={demoLoading}>
        <Play size={14} fill="currentColor" /> {demoLoading ? 'Making your sample…' : 'Try a sample video'}
      </button>
      <details className="url-import"><summary>Or use a direct video link</summary><form onSubmit={submitUrl}><input type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://example.com/video.mp4" aria-label="Direct video URL" /><button className="button button-light" type="submit" disabled={urlLoading}>{urlLoading ? 'Opening…' : 'Open link'}</button></form></details>
      <span className="upload-formats">MP4, MOV, WEBM, MKV · up to 2 GB</span>
      {error && <div className="error-message" role="alert">{error}</div>}
    </section>
  )
}

function HomePage({ onFileChange, onDrop, loadDemo, demoLoading, error, importFromUrl }: UploadProps) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> THE VIDEO TOOLKIT THAT GETS IT</div>
          <h1>Edit video.<br />Hide what matters.<br /><span className="gradient-text">Nothing leaves</span> your device.</h1>
          <p>All the tools you need, with the privacy you deserve. Edit videos right in your browser — no uploads, no waiting, no surprises.</p>
          <div className="hero-benefits"><span><Check size={14} /> Free to use</span><span><Check size={14} /> No account needed</span><span><Check size={14} /> 100% on-device</span></div>
        </div>
        <div className="hero-upload-wrap">
          <UploadZone {...{ onFileChange, onDrop, loadDemo, demoLoading, error, importFromUrl }} heroScene />
          <div className="float-card float-card-top"><span className="float-icon"><ShieldCheck size={16} /></span><span><b>Private by design</b><small>Your files stay on your device</small></span><BadgeCheck className="float-check" size={17} /></div>
          <div className="float-card float-card-bottom"><span className="audio-wave"><i /><i /><i /><i /><i /><i /><i /><i /></span><span><b>Your edit, your rules</b><small>One smooth creative flow</small></span></div>
        </div>
      </section>
      <div className="trust-strip"><span><LockKeyhole size={15} /> 100% private processing</span><i /><span><CloudOff size={16} /> No uploads. Ever.</span><i /><span><HardDrive size={15} /> Files stay on your device</span></div>

      <section className="home-showcase page-section">
        <div className="section-heading centered">
          <div className="eyebrow"><span className="eyebrow-dot" /> WHY MAGICBLUR FEELS DIFFERENT</div>
          <h2>Everything you need for a cleaner, calmer workflow.</h2>
        </div>
        <div className="showcase-grid">
          <article className="showcase-card">
            <span className="showcase-icon purple"><LockKeyhole size={18} /></span>
            <h3>Private by default</h3>
            <p>Your video stays local, so you can edit freely without worrying about uploads or surprise cloud storage.</p>
          </article>
          <article className="showcase-card">
            <span className="showcase-icon teal"><Clapperboard size={18} /></span>
            <h3>Built for everyday edits</h3>
            <p>Trim clips, tweak speed, crop framing, and convert formats from one clean browser-based workspace.</p>
          </article>
          <article className="showcase-card">
            <span className="showcase-icon peach"><Sparkles size={18} /></span>
            <h3>Speed without the stress</h3>
            <p>Jump in, preview instantly, and export locally when you're happy with the result — no learning curve needed.</p>
          </article>
        </div>
      </section>

      <section className="home-workflow page-section">
        <div className="workflow-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> HOW IT WORKS</div>
          <h2>Three simple steps, from upload to export.</h2>
          <ol className="workflow-list">
            <li><strong>1.</strong> Bring in your clip and choose the edit you want.</li>
            <li><strong>2.</strong> Fine-tune the timeline, crop, trim, resize or convert.</li>
            <li><strong>3.</strong> Export privately to your device in a few clicks.</li>
          </ol>
        </div>
        <div className="workflow-panel">
          <div className="mini-metric">
            <span>Local edits</span>
            <strong>100%</strong>
          </div>
          <div className="mini-metric">
            <span>Formats</span>
            <strong>MP4 / MOV / MKV / WEBM / GIF / MP3</strong>
          </div>
          <div className="mini-metric">
            <span>Storage</span>
            <strong>On this device only</strong>
          </div>
        </div>
      </section>

      <section className="home-cta page-section">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> READY TO MAKE YOUR NEXT VIDEO?</div>
          <h2>Start with a clip, keep the magic, and export on your own terms.</h2>
        </div>
        <Link className="button button-primary" to="/trim">Start editing <ArrowRight size={15} /></Link>
      </section>
    </>
  )
}

function ConversionIndexPage({ uploadProps }: { uploadProps: UploadProps }) {
  return <section className="info-page page-section">
    <div className="tool-breadcrumb"><Link to="/">Home</Link><span>/</span><span>Convert</span></div>
    <div className="tool-landing-head"><div className="tool-icon large-icon icon-cyan"><FileVideo2 size={24} /></div><div><div className="eyebrow">FORMAT CONVERTERS</div><h1>Convert video in seconds</h1></div></div>
    <p className="tool-description">Switch your clip to the format you need without uploading it anywhere. Choose the format below and export from your browser.</p>
    <div className="tool-workspace-layout"><div><UploadZone {...uploadProps} compact /><div className="tool-seo-copy"><h2>Pick the right output format</h2><p>MagicBlur keeps your workflow private while you move between MP4, MOV, MKV, WebM, GIF and MP3 exports. The file stays on your device from import to download.</p><div className="tool-privacy-inline"><LockKeyhole size={15} /> Your video never leaves your device.</div></div></div>
      <aside className="tool-aside"><div className="aside-card"><span className="aside-icon"><Sparkles size={18} /></span><h3>Everything in one flow</h3><p>Import your clip, choose a target format, and export it locally. No uploads. No waiting for a server.</p><span className="aside-stat"><Check size={13} /> Works in your browser</span></div><div className="aside-card soft-aside"><span className="aside-icon"><LockKeyhole size={18} /></span><h3>Made private by default</h3><p>Video conversion and export happen on-device. Your content stays in your control.</p><Link to="/privacy">How privacy works <ArrowRight size={14} /></Link></div></aside>
    </div>
    <div className="conversion-categories" style={{ marginTop: '2.5rem' }}>
      {(['Video', 'Audio', 'Creative', 'Social'] as const).map(category => (
        <details className="conversion-category" key={category} open={category === 'Video'}>
          <summary><span className={`category-icon category-${category.toLowerCase()}`}>{category === 'Social' ? <Globe2 size={16} /> : category === 'Creative' ? <Sparkles size={16} /> : category === 'Audio' ? <AudioLines size={16} /> : <FileVideo2 size={16} />}</span><span className="category-summary-copy"><b>{category === 'Creative' ? 'GIF & creative' : category === 'Social' ? 'Social media' : `${category} formats`}</b><small>{category === 'Video' ? 'MP4, MOV, MKV, WEBM' : category === 'Audio' ? 'Extract audio as MP3' : category === 'Creative' ? 'Make a GIF from your clip' : 'Get your clips share-ready'}</small></span><ChevronDown className="category-chevron" size={16} /></summary>
          <div className="format-links">{conversionTargets.filter(target => target.category === category).map(target => <Link key={target.slug} to={`/convert/${target.slug}`}>{target.name}<ArrowRight size={13} /></Link>)}</div>
        </details>
      ))}
    </div>
  </section>
}

function ConversionPage({ target, editor, uploadProps, setExportFormat }: {
  target: ConversionTarget
  editor: ReactNode
  uploadProps: UploadProps
  setExportFormat: (format: ExportFormat) => void
}) {
  useEffect(() => { setExportFormat(target.format) }, [setExportFormat, target.format])
  if (editor) return <>{editor}</>
  return <section className="tool-landing">
    <div className="tool-breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/convert">Convert</Link><span>/</span><span>{target.name}</span></div>
    <div className="tool-landing-head"><div className="tool-icon large-icon icon-cyan"><FileVideo2 size={24} /></div><div><div className="eyebrow">{target.category.toUpperCase()} CONVERTER</div><h1>{target.name} video converter</h1></div></div>
    <p className="tool-description">{target.description}</p>
    <div className="tool-workspace-layout"><div><UploadZone {...uploadProps} compact /><div className="tool-seo-copy"><h2>Convert to {target.name}, right here</h2><p>{target.description} Choose your video to get started. MagicBlur converts directly in your browser, so your footage never leaves your device.</p><div className="tool-privacy-inline"><LockKeyhole size={15} /> Your video never leaves your device.</div></div></div>
      <aside className="tool-aside"><div className="aside-card"><span className="aside-icon"><FileVideo2 size={18} /></span><h3>{target.name} format</h3><p>{target.category === 'Social' ? 'Share-ready MP4, made locally in your browser.' : `Choose ${target.name} in your export settings after importing your video.`}</p><span className="aside-stat"><Check size={13} /> Private, on-device conversion</span></div><div className="aside-card soft-aside"><span className="aside-icon"><LockKeyhole size={18} /></span><h3>Nothing gets uploaded</h3><p>Your original stays on your device. Conversion happens right in this browser.</p><Link to="/privacy">How privacy works <ArrowRight size={14} /></Link></div></aside>
    </div>
  </section>
}

function ToolLanding({ tool, ...upload }: { tool: Tool } & UploadProps) {
  const Icon = tool.icon
  return <section className="tool-landing">
    <div className="tool-breadcrumb"><Link to="/">Home</Link><span>/</span><span>{tool.name}</span></div>
    <div className="tool-landing-head"><div className={`tool-icon large-icon icon-${tool.tint}`}><Icon size={24} /></div><div><div className="eyebrow">{tool.group.toUpperCase()} TOOL</div><h1>{tool.name} video online</h1></div></div>
    <p className="tool-description">{tool.description}</p>
    {(tool.slug === 'smart-blur' || tool.slug === 'manual-blur') && <div className="responsible-use"><ShieldCheck size={15} /><span>Use MagicBlur to protect privacy. Don't use it to mislead others or hide wrongdoing.</span></div>}
    <div className="tool-workspace-layout"><div><UploadZone {...upload} compact /><div className="tool-seo-copy"><h2>{tool.name}, made simple</h2><p>{tool.description} MagicBlur processes your video locally in your browser, so your footage never leaves your device. No uploads, no account, no complicated software.</p><div className="tool-privacy-inline"><LockKeyhole size={15} /> Your video never leaves your device.</div></div></div>
      <aside className="tool-aside"><div className="aside-card"><span className="aside-icon"><Sparkles size={18} /></span><h3>Simple by design</h3><p>Adjust your settings, add the step to your edit, and export when you're happy.</p><span className="aside-stat"><Check size={13} /> Runs right in your browser</span></div><div className="aside-card soft-aside"><span className="aside-icon"><CircleHelp size={18} /></span><h3>Need a hand?</h3><p>Everything stays on your device. Use the live preview to get it just right.</p><Link to="/privacy">How privacy works <ArrowRight size={14} /></Link></div></aside>
    </div>
  </section>
}

function EditorPage(props: {
  tool: Tool; file: File; objectUrl: string; videoRef: React.RefObject<HTMLVideoElement | null>
  steps: Operation[]; extras: File[]; setExtras: (files: File[]) => void
  recordSteps: (next: Operation[]) => void; addOperation: (kind: OperationKind, label: string, detail: string, values?: Record<string, number | string>) => void
  undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean
  sessionMessage: string; clearSavedSession: () => Promise<void>
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void; onDrop: (event: DragEvent<HTMLElement>) => void
  duration: number; setDuration: (time: number) => void; currentTime: number; setCurrentTime: (time: number) => void
  videoDimensions: { width: number; height: number }
  setVideoDimensions: (dimensions: { width: number; height: number }) => void
  exportFormat: ExportFormat; setExportFormat: (format: ExportFormat) => void; quality: string; setQuality: (quality: string) => void
  startExport: () => void; working: boolean; progress: number | null; cancel: () => void
  exportedUrl: string; exportedName: string; error: string; setError: (value: string) => void; isIsolated: boolean
}) {
  const { tool, file, objectUrl, videoRef, steps, extras, setExtras, recordSteps, addOperation, undo, redo, canUndo, canRedo, sessionMessage, clearSavedSession, duration, setDuration, videoDimensions, setVideoDimensions, currentTime, setCurrentTime, exportFormat, setExportFormat, quality, setQuality, startExport, working, progress, cancel, exportedUrl, exportedName, error, setError, isIsolated } = props
  const [panelValue, setPanelValue] = useState({ start: '0', end: '', width: '1280', height: '720', speed: '1', volume: '100', crop: '80', rotation: '90' })
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const durationValue = Math.max(duration || 0, 0)
  const timeLabel = (time: number) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toFixed(2).padStart(5, '0')}`

  const submitToolOperation = () => {
    const start = Math.max(0, Number(panelValue.start) || 0)
    const end = Math.min(duration || Number(panelValue.end), Number(panelValue.end) || duration)
    switch (tool.slug) {
      case 'trim': addOperation('trim', 'Trim', `${timeLabel(start)} – ${timeLabel(end)}`, { start, end }); break
      case 'crop': {
        const ratio = Math.max(20, Math.min(100, Number(panelValue.crop) || 80)) / 100
        addOperation('crop', 'Crop', `${Math.round(ratio * 100)}% · centered`, { ratio })
        break
      }
      case 'rotate': addOperation('rotate', 'Rotate', `${panelValue.rotation}° clockwise`, { degrees: Number(panelValue.rotation) }); break
      case 'flip': addOperation('flip', 'Flip', 'Horizontal', { horizontal: 1 }); break
      case 'resize': {
        const width = Number(panelValue.width)
        const height = Number(panelValue.height)
        if (width * height > 1280 * 720) {
          setError('Exports above 720p are Premium features. Choose a 720p resolution or smaller.')
          break
        }
        addOperation('resize', 'Resize', `${width} × ${height}`, { width, height })
        break
      }
      case 'speed': addOperation('speed', 'Change speed', `${panelValue.speed}×`, { speed: Number(panelValue.speed) }); break
      case 'volume': addOperation('volume', 'Adjust volume', `${panelValue.volume}%`, { volume: Number(panelValue.volume) / 100 }); break
      case 'loop': addOperation('loop', 'Loop', 'Repeat 2 times', { loops: 2 }); break
      case 'merge': addOperation('merge', 'Merge clips', `${extras.length + 1} clips`, { count: extras.length + 1 }); break
      case 'convert': addOperation('convert', 'Convert format', exportFormat.toUpperCase(), { format: exportFormat }); break
      case 'gif': addOperation('gif', 'Create GIF', 'Optimized GIF', { format: 'gif' }); setExportFormat('gif'); break
      default: setError(`${tool.name} is coming in the next build stage.`)
    }
  }

  const selectExtraFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    const valid = selected.filter(item => item.type.startsWith('video/') || item.type.startsWith('audio/') || /\.(mp4|mov|webm|mkv|avi|m4v|mpeg|mpg|mp3|wav|m4a|aac|ogg)$/i.test(item.name))
    if (valid.length !== selected.length) setError('Please choose a video or audio file.')
    setExtras([...extras, ...valid].slice(0, 8))
    event.target.value = ''
  }

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length || from === to) return
    const next = [...steps]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    recordSteps(next)
  }

  const handleStepKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    const to = event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1 : null
    if (to === null) return
    event.preventDefault()
    const movedStepId = steps[index].id
    moveStep(index, to)
    window.requestAnimationFrame(() => document.getElementById(`pipeline-step-${movedStepId}`)?.focus())
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }

  const seek = (value: number) => {
    setCurrentTime(value)
    if (videoRef.current) videoRef.current.currentTime = value
  }

  const shareOutput = async () => {
    if (!exportedUrl || !navigator.share) return
    try {
      const response = await fetch(exportedUrl)
      const blob = await response.blob()
      const shareFile = new File([blob], exportedName, { type: blob.type })
      if (navigator.canShare?.({ files: [shareFile] })) await navigator.share({ files: [shareFile], title: exportedName })
    } catch (reason) { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError('Sharing is not available on this device. Download your video instead.') }
  }

  return (
    <section className="editor-page">
      <div className="editor-breadcrumb"><Link to="/">Home</Link><span>/</span><span>{tool.name}</span><span className="editor-private"><LockKeyhole size={12} /> Private session</span></div>
      <div className="editor-topline"><div className="editor-file-title"><span className="file-type-icon"><FileVideo2 size={18} /></span><span><b>{file.name}</b><small>{(file.size / (1024 * 1024)).toFixed(1)} MB{duration ? ` · ${timeLabel(duration)}` : ''}</small></span></div><div className="editor-actions"><button className="icon-button" disabled={!canUndo} onClick={undo} title="Undo"><span className="history-arrow">↶</span></button><button className="icon-button" disabled={!canRedo} onClick={redo} title="Redo"><span className="history-arrow">↷</span></button><label className="button button-light replace-file"><Upload size={14} /> Replace<input type="file" accept="video/*,.mkv,.mov,.webm" onChange={props.onFileChange} /></label></div></div>

      <div className="editor-grid">
        <div className="editor-main">
          <div className="player-card">
            <div className="player-stage">
              <video ref={videoRef} src={objectUrl} onLoadedMetadata={event => { setDuration(event.currentTarget.duration || 0); setVideoDimensions({ width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight }) }} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onError={() => setError('This video could not be previewed. Try another format or convert it after importing.')} playsInline preload="metadata" />
              <div className="player-overlay-chip"><span className="live-dot" /> PREVIEW</div>
              <button className="play-overlay" onClick={togglePlay} aria-label="Play or pause video"><Play size={22} fill="currentColor" /></button>
              <div className="player-resolution">Original · <span>{videoDimensions.width || '—'} × {videoDimensions.height || '—'}</span></div>
            </div>
            <div className="player-controls">
              <button className="play-small" onClick={togglePlay} aria-label="Play or pause video"><Play size={15} fill="currentColor" /></button>
              <span className="player-time">{timeLabel(currentTime)} <span>/ {timeLabel(duration)}</span></span>
              <input aria-label="Video timeline, use arrow keys to seek" className="scrubber" type="range" min="0" max={durationValue || 1} step="0.01" value={Math.min(currentTime, durationValue || 0)} onChange={event => seek(Number(event.target.value))} />
              <button className="icon-button compact-icon" aria-label="Timeline options"><ArrowDownUp size={14} /></button>
            </div>
          </div>

          <div className="timeline-card">
            <div className="timeline-heading"><div><b>Timeline</b><span>{steps.length} edit{steps.length === 1 ? '' : 's'} queued</span></div><span className="timeline-keyboard">← → to scrub</span></div>
            <div className="timeline-ruler"><span>00:00</span><span>{timeLabel(duration / 2)}</span><span>{timeLabel(duration)}</span></div>
            <div className="timeline-track" style={{ backgroundImage: 'linear-gradient(90deg, rgba(102,77,202,.28) 0%, rgba(59,201,220,.2) 28%, rgba(248,180,142,.25) 53%, rgba(120,161,210,.26) 76%, rgba(102,77,202,.2) 100%)' }}>
              <input className="timeline-range" aria-label="Keyboard-accessible video timeline" type="range" min="0" max={durationValue || 1} step="0.01" value={Math.min(currentTime, durationValue || 0)} onChange={event => seek(Number(event.target.value))} />
              <span className="timeline-cursor" style={{ left: `${durationValue ? (currentTime / durationValue) * 100 : 0}%` }} />
              <div className="trim-handle trim-start" title="Trim start preview"><span /></div><div className="trim-handle trim-end" title="Trim end preview"><span /></div>
            </div>
            <div className="timeline-footer"><span><span className="timeline-track-dot" /> Video · {file.name}</span><span>{timeLabel(currentTime)} / {timeLabel(duration)}</span></div>
          </div>

          <div className="pipeline-card">
            <div className="pipeline-title"><div><span className="step-count">{steps.length.toString().padStart(2, '0')}</span><div><b>Your edit</b><small>Reorder with drag or arrow keys. Render once.</small></div></div><span className="pipeline-status"><span /> {steps.length ? 'Ready to export' : 'No edits yet'}</span></div>
            {steps.length === 0 ? <div className="pipeline-empty"><Sparkles size={15} /> Your edits will appear here. Add a tool on the right to get started.</div> :
              <div className="pipeline-list" role="list" aria-label="Applied video edits">{steps.map((step, index) => {
                const Icon = operationIcons[step.kind]
                return <div key={step.id} id={`pipeline-step-${step.id}`} className="pipeline-item" role="listitem" tabIndex={0} aria-label={`${step.label}, position ${index + 1} of ${steps.length}. Use arrow keys to reorder.`} onKeyDown={event => handleStepKeyDown(event, index)} draggable onDragStart={() => setDraggingIndex(index)} onDragOver={event => event.preventDefault()} onDrop={() => { if (draggingIndex !== null) moveStep(draggingIndex, index); setDraggingIndex(null) }}>
                  <span className="pipeline-grip" title="Drag to reorder" aria-hidden="true">⠿</span><span className="pipeline-step-icon"><Icon size={14} /></span><span className="pipeline-step-name"><b>{step.label}</b><small>{step.detail}</small></span><span className="pipeline-number">{String(index + 1).padStart(2, '0')}</span><div className="pipeline-item-actions"><button className="move-step" disabled={index === 0} onClick={() => moveStep(index, index - 1)} aria-label={`Move ${step.label} up`} title="Move up"><ArrowUp size={13} /></button><button className="move-step" disabled={index === steps.length - 1} onClick={() => moveStep(index, index + 1)} aria-label={`Move ${step.label} down`} title="Move down"><ArrowDown size={13} /></button><button className="remove-step" onClick={() => recordSteps(steps.filter(item => item.id !== step.id))} aria-label={`Remove ${step.label} step`}><X size={14} /></button></div>
                </div>
              })}</div>}
            <div className="local-session-status"><span><LockKeyhole size={12} /> {sessionMessage || 'This edit is saved only in this browser.'}</span><button onClick={() => void clearSavedSession()}>Forget saved edit</button></div>
          </div>
        </div>

        <aside className="editor-sidebar">
          <div className="tool-panel">
            <div className="tool-panel-heading"><span className={`tool-icon panel-icon icon-${tool.tint}`}><tool.icon size={17} /></span><div><b>{tool.name}</b><small>Adjust your settings</small></div><span className="panel-shortcut">01</span></div>
            <div className="tool-controls">
              {tool.slug === 'trim' && <>
                <div className="field-pair"><label>Start time<input type="number" min="0" max={duration || undefined} step="0.1" value={panelValue.start} onChange={event => setPanelValue({ ...panelValue, start: event.target.value })} /></label><label>End time<input type="number" min="0" max={duration || undefined} step="0.1" placeholder={duration.toFixed(1)} value={panelValue.end} onChange={event => setPanelValue({ ...panelValue, end: event.target.value })} /></label></div>
                <div className="control-hint"><Clock3 size={13} /> Current length: {timeLabel(duration)}</div>
              </>}
              {tool.slug === 'crop' && <><label className="field-label">Crop area<select className="full-select" value={panelValue.crop} onChange={event => setPanelValue({ ...panelValue, crop: event.target.value })}><option value="80">80% · centered</option><option value="60">60% · centered</option><option value="50">50% · centered</option></select></label><div className="crop-preview"><div className="crop-frame"><Crop size={17} /></div><span>Preview crop area</span></div><div className="control-hint"><MoveRight size={13} /> Centered crop, keeps your subject in frame</div></>}
              {tool.slug === 'rotate' && <><label className="field-label">Rotation</label><div className="segmented-control">{['90', '180', '270'].map(degrees => <button key={degrees} className={panelValue.rotation === degrees ? 'selected' : ''} onClick={() => setPanelValue({ ...panelValue, rotation: degrees })}><RotateCw size={13} style={{ transform: `rotate(${degrees}deg)` }} /> {degrees}°</button>)}</div><div className="control-hint"><RotateCw size={13} /> Rotate clockwise</div></>}
              {tool.slug === 'flip' && <><label className="field-label">Flip video</label><div className="segmented-control"><button className="selected" onClick={() => {}}><FlipHorizontal size={14} /> Horizontal</button><button onClick={() => addOperation('flip', 'Flip', 'Vertical', { horizontal: 0 })}><FlipVertical size={14} /> Vertical</button></div><div className="control-hint"><ArrowLeftRight size={13} /> Mirror your video in one tap</div></>}
              {tool.slug === 'resize' && <><label className="field-label">Resolution</label><div className="segmented-control resize-presets">{[['1280', '720', '720p'], ['1920', '1080', '1080p'], ['1080', '1920', 'Portrait']].map(([width, height, label]) => <button key={label} className={panelValue.width === width ? 'selected' : ''} onClick={() => setPanelValue({ ...panelValue, width, height })}>{label}</button>)}</div><div className="field-pair"><label>Width<input type="number" value={panelValue.width} onChange={event => setPanelValue({ ...panelValue, width: event.target.value })} /></label><label>Height<input type="number" value={panelValue.height} onChange={event => setPanelValue({ ...panelValue, height: event.target.value })} /></label></div></>}
              {tool.slug === 'speed' && <><label className="field-label">Playback speed <span className="field-value">{panelValue.speed}×</span></label><div className="speed-options">{['0.5', '0.75', '1', '1.5', '2'].map(speed => <button className={panelValue.speed === speed ? 'selected' : ''} key={speed} onClick={() => setPanelValue({ ...panelValue, speed })}>{speed}×</button>)}</div><div className="control-hint"><Gauge size={13} /> {Number(panelValue.speed) < 1 ? 'Slow it down' : Number(panelValue.speed) > 1 ? 'Speed it up' : 'Original speed'}</div></>}
              {tool.slug === 'volume' && <><label className="field-label">Volume <span className="field-value">{panelValue.volume}%</span></label><Slider aria-label="Video volume" className="range-control radix-slider" min={0} max={200} step={1} value={[Number(panelValue.volume)]} onValueChange={([value]) => setPanelValue({ ...panelValue, volume: String(value) })} /><div className="range-labels"><span>Mute</span><span>Original</span><span>Boost</span></div></>}
              {tool.slug === 'merge' && <><p className="tool-intro">Add video clips to join them into one seamless video.</p><label className="button button-light add-files"><Upload size={14} /> Add clips<input type="file" accept="video/*" multiple onChange={selectExtraFiles} /></label>{extras.map((item, index) => <div className="extra-file" key={`${item.name}-${index}`}><Film size={14} /><span>{item.name}</span><button onClick={() => setExtras(extras.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${item.name}`}><X size={13} /></button></div>)}</>}
              {tool.slug === 'convert' && <><label className="field-label">Output format</label><select className="full-select" value={exportFormat} onChange={event => setExportFormat(event.target.value as ExportFormat)}><option value="mp4">MP4 · H.264</option><option value="mov">MOV · QuickTime</option><option value="mkv">MKV · Matroska</option><option value="webm">WebM · VP9</option><option value="gif">GIF · Animated image</option><option value="mp3">MP3 · Audio only</option></select><p className="control-hint">Pick a format. Your original stays untouched.</p></>}
              {tool.slug === 'gif' && <><label className="field-label">GIF quality</label><select className="full-select" value={quality} onChange={event => setQuality(event.target.value)}><option value="high">High · smoother color</option><option value="medium">Balanced · smaller file</option><option value="low">Compact · fastest export</option></select><p className="control-hint">GIFs are best for short clips under 10 seconds.</p></>}
              {!['trim', 'crop', 'rotate', 'flip', 'resize', 'speed', 'volume', 'merge', 'convert', 'gif'].includes(tool.slug) && <div className="coming-tool"><Sparkles size={15} /><span>This tool is being built next. Your editor is ready for more.</span></div>}
              {error && <div className="error-message inline-error" role="alert">{error}</div>}
              <Button variant="primary" className="add-step-button" onClick={submitToolOperation}><span>+</span> Add to edit</Button>
            </div>
          </div>

          <div className="export-card">
            <div className="export-card-heading"><span className="export-icon"><Download size={16} /></span><div><b>Export video</b><small>All edits, one render</small></div></div>
            <label className="field-label export-label">Format</label>
            <div className="format-options">{(['mp4', 'webm', 'mov', 'mkv', 'gif', 'mp3'] as ExportFormat[]).map(format => <button key={format} className={exportFormat === format ? 'selected' : ''} onClick={() => setExportFormat(format)}>{format.toUpperCase()}</button>)}</div>
            <label className="field-label export-label">Quality</label>
            <select className="full-select" value={quality} onChange={event => setQuality(event.target.value)}><option value="high">High quality · 720p</option><option value="balanced">Balanced · smaller file</option><option value="low">Fast export</option></select>
            <div className="export-info"><span><HardDrive size={13} /> Original file stays unchanged</span><span>{isIsolated ? <><BadgeCheck size={13} /> Fast, multithread-ready</> : <><ShieldCheck size={13} /> Private, single-thread mode</>}</span></div>
            {progress !== null ? <div className="export-progress"><div className="progress-row"><span>Exporting locally…</span><b>{Math.round(progress * 100)}%</b></div><div className="progress-track"><span style={{ width: `${Math.min(progress * 100, 100)}%` }} /></div><button className="cancel-export" onClick={cancel}>Cancel export</button></div> :
              exportedUrl ? <div className="export-success"><div className="success-message"><Check size={14} /> Your video is ready</div><a className="button button-primary download-button" href={exportedUrl} download={exportedName}><Download size={15} /> Download video</a>{typeof navigator !== 'undefined' && 'share' in navigator && <button className="button button-light share-button" onClick={shareOutput}>Share video <ArrowRight size={14} /></button>}</div> :
                <button className="button button-dark export-button" disabled={working} onClick={startExport}>{working ? 'Preparing…' : 'Export video'} <ArrowRight size={15} /></button>}
            <p className="export-footnote"><LockKeyhole size={11} /> Your video never leaves your device.</p>
          </div>
          <div className="editor-note"><ShieldCheck size={15} /><span>Your file and edits are saved only in this browser. Use “Forget saved edit” to clear the local session.</span></div>
        </aside>
      </div>
      <div className="editor-next-tool"><span>Ready for another step?</span>{tools.filter(item => item.slug !== tool.slug && ['trim', 'crop', 'rotate', 'flip', 'resize', 'speed', 'volume', 'merge'].includes(item.slug)).slice(0, 5).map(item => <Link key={item.slug} to={`/${item.slug}`}>{item.name}<ArrowRight size={12} /></Link>)}</div>
    </section>
  )
}

function PrivacyPage() {
  return <section className="info-page"><div className="eyebrow"><span className="eyebrow-dot" /> PRIVACY IS THE WHOLE POINT</div><h1>Your video stays<br /><span className="gradient-text">right where it belongs.</span></h1><p className="info-lede">MagicBlur processes video locally, on your own device. Your video file is never uploaded to our servers.</p>
    <div className="privacy-steps">{[{ icon: <Upload />, title: 'You choose a file', text: 'Your browser opens the video from your device. We do not send the file anywhere.' }, { icon: <Clapperboard />, title: 'Your browser does the work', text: 'Video editing and export use local browser technology. Processing happens on your device, not in a cloud.' }, { icon: <CloudOff />, title: 'Your video stays yours', text: 'The current video and edit steps may be saved in IndexedDB on this device so your work can be restored. Choose “Forget saved edit” in the editor to delete that local copy.' }].map((step, index) => <article className="privacy-step" key={step.title}><span className="privacy-step-icon">{step.icon}</span><span className="privacy-step-number">0{index + 1}</span><h2>{step.title}</h2><p>{step.text}</p></article>)}</div>
    <div className="privacy-technical"><LockKeyhole size={18} /><div><b>Local, not cloud storage</b><p>Videos, file names and edit steps stay in this browser's IndexedDB and are never transmitted to our servers. Clearing the saved edit from the editor removes its local session record. Direct-from-URL imports contact the URL you provide; that external website is separate from MAGICBLUR.</p></div></div>
  </section>
}

function PricingPage() {
  return <section className="info-page pricing-page"><div className="eyebrow"><span className="eyebrow-dot" /> SIMPLE PLANS, NO SURPRISES</div><h1>Make a little more<br /><span className="gradient-text">room for magic.</span></h1><p className="info-lede">Everything you need to get started is free. Premium plans are coming soon.</p><div className="plan-cards"><article className="plan-card"><span className="plan-label">FREE, ALWAYS</span><h2>$0 <small>/ forever</small></h2><p>All the essentials, right in your browser.</p><ul><li><Check /> Local video editing</li><li><Check /> 720p exports</li><li><Check /> No watermark</li><li><Check /> No account needed</li></ul></article><article className="plan-card premium-plan"><span className="plan-label">PREMIUM · COMING SOON</span><h2>$6 <small>/ month</small></h2><p>More room for your bigger ideas.</p><ul><li><Check /> Up to 4K exports</li><li><Check /> Longer video projects</li><li><Check /> Batch processing</li><li><Check /> Every file stays on-device</li></ul><span className="plan-coming-soon"><Sparkles size={13} /> Premium isn't available yet</span></article></div></section>
}

function NotFound() {
  return <section className="not-found"><span className="not-found-mark"><Film size={27} /></span><span className="eyebrow">A LITTLE OFF THE TIMELINE</span><h1>That page isn't in<br /><span className="gradient-text">the frame.</span></h1><p>Let's get you back to your videos.</p><Link className="button button-primary" to="/">Back to MAGICBLUR <ArrowRight size={15} /></Link></section>
}

export default App
