import {
  AudioLines, Captions, Crop, FileVideo2, FlipHorizontal, Gauge, ImagePlus,
  Layers, MoveHorizontal, Repeat, RotateCw, Scissors, Shield, SlidersHorizontal,
  Type, Volume2, WandSparkles,
} from 'lucide-react'

export type ToolGroup = 'Privacy' | 'Edit' | 'Combine' | 'Convert'
export type Tool = {
  slug: string
  name: string
  short: string
  description: string
  group: ToolGroup
  tint: 'violet' | 'cyan' | 'peach' | 'green'
  icon: typeof Scissors
  ready: boolean
}

export type ConversionTarget = {
  slug: string
  name: string
  category: 'Video' | 'Audio' | 'Creative' | 'Social'
  format: 'mp4' | 'mov' | 'mkv' | 'webm' | 'gif' | 'mp3'
  description: string
}

export const conversionTargets: ConversionTarget[] = [
  { slug: 'mp4', name: 'MP4', category: 'Video', format: 'mp4', description: 'Convert videos to MP4 online in your browser. Export a widely compatible H.264 video without uploading your file.' },
  { slug: 'mov', name: 'MOV', category: 'Video', format: 'mov', description: 'Convert videos to MOV online, privately. Export a QuickTime video right on your device.' },
  { slug: 'mkv', name: 'MKV', category: 'Video', format: 'mkv', description: 'Convert videos to MKV online without a server upload. Your original stays safe on your device.' },
  { slug: 'webm', name: 'WEBM', category: 'Video', format: 'webm', description: 'Convert videos to WebM online, right in your browser. Keep your video local from import to export.' },
  { slug: 'mp3', name: 'MP3', category: 'Audio', format: 'mp3', description: 'Extract audio and convert video to MP3 in your browser. Your video is never uploaded.' },
  { slug: 'gif', name: 'GIF', category: 'Creative', format: 'gif', description: 'Convert a short video clip into an animated GIF. Preview and export directly on your device.' },
  { slug: 'tiktok', name: 'TikTok video', category: 'Social', format: 'mp4', description: 'Get your video ready to share on TikTok. Edit it locally and export a private MP4 video.' },
  { slug: 'instagram', name: 'Instagram video', category: 'Social', format: 'mp4', description: 'Get your video ready to share on Instagram. Edit clips in your browser without uploading them.' },
  { slug: 'x-twitter', name: 'X / Twitter video', category: 'Social', format: 'mp4', description: 'Get your video ready to share on X. Convert and export privately in your browser.' },
  { slug: 'whatsapp', name: 'WhatsApp Status', category: 'Social', format: 'mp4', description: 'Get a video ready for WhatsApp Status. Make a private MP4 export directly on your device.' },
]

export const tools: Tool[] = [
  { slug: 'smart-blur', name: 'Smart Blur', short: 'Hide faces and details', description: 'Blur faces and sensitive details in your video. Automatic detection is coming soon; manual controls are in development.', group: 'Privacy', tint: 'violet', icon: WandSparkles, ready: false },
  { slug: 'manual-blur', name: 'Manual Blur', short: 'Choose what to hide', description: 'Choose the exact area you want to blur and keep the rest of the frame crisp. Manual blur controls are coming soon.', group: 'Privacy', tint: 'cyan', icon: Layers, ready: false },
  { slug: 'remove-logo', name: 'Remove Logo', short: 'Clean up your frame', description: 'Remove or cover a logo in your video. Logo editing controls are coming soon.', group: 'Privacy', tint: 'peach', icon: Shield, ready: false },
  { slug: 'trim', name: 'Trim', short: 'Keep the good bits', description: 'Trim your video to the exact moment you want. Set the start and end, preview your clip, and export in your favorite format — free and right in your browser.', group: 'Edit', tint: 'violet', icon: Scissors, ready: true },
  { slug: 'crop', name: 'Crop', short: 'Frame it just right', description: 'Crop your video to a tighter frame with a few clicks. Center a new crop, preview the result, and export with no upload required.', group: 'Edit', tint: 'cyan', icon: Crop, ready: true },
  { slug: 'rotate', name: 'Rotate', short: 'Set the right angle', description: 'Rotate your video by 90, 180 or 270 degrees. Fix sideways footage and preview every change before exporting.', group: 'Edit', tint: 'peach', icon: RotateCw, ready: true },
  { slug: 'flip', name: 'Flip', short: 'Mirror your video', description: 'Flip your video horizontally or vertically in a tap. Your original stays safe while your edited copy is processed locally.', group: 'Edit', tint: 'green', icon: FlipHorizontal, ready: true },
  { slug: 'resize', name: 'Resize', short: 'Fit any screen', description: 'Resize a video for mobile, social media or a smaller file size. Choose a ready-made resolution and keep the original proportions.', group: 'Edit', tint: 'violet', icon: MoveHorizontal, ready: true },
  { slug: 'loop', name: 'Loop', short: 'Make it play again', description: 'Loop a video clip to make it play again. Adjust your edit in the shared video workspace.', group: 'Edit', tint: 'cyan', icon: Repeat, ready: true },
  { slug: 'speed', name: 'Speed', short: 'Slow it down or up', description: 'Make your video faster or slower in a few clicks. Preview your edit and adjust the sound in the same private workspace.', group: 'Edit', tint: 'peach', icon: Gauge, ready: true },
  { slug: 'volume', name: 'Volume', short: 'Tune the sound', description: 'Turn down, boost or mute your video audio. Change the volume in the browser without uploading the original.', group: 'Edit', tint: 'green', icon: Volume2, ready: true },
  { slug: 'stabilize', name: 'Stabilize', short: 'Smooth shaky footage', description: 'Smooth shaky video footage with stabilization controls. Stabilization is coming in a later build stage.', group: 'Edit', tint: 'violet', icon: SlidersHorizontal, ready: false },
  { slug: 'merge', name: 'Merge', short: 'Join clips together', description: 'Join your video clips into one seamless video. Add clips, arrange your edit and export from one local workspace.', group: 'Combine', tint: 'cyan', icon: Layers, ready: true },
  { slug: 'add-audio', name: 'Add Audio', short: 'Bring in a soundtrack', description: 'Add a soundtrack or voiceover to your video. Audio mixing controls are coming soon.', group: 'Combine', tint: 'peach', icon: AudioLines, ready: false },
  { slug: 'add-image', name: 'Add Image', short: 'Layer in a picture', description: 'Add an image or logo over your video. Image overlay controls are coming soon.', group: 'Combine', tint: 'green', icon: ImagePlus, ready: false },
  { slug: 'add-text', name: 'Add Text', short: 'Give it a title', description: 'Add a title, caption or note on top of your video. Text overlay controls are coming soon.', group: 'Combine', tint: 'violet', icon: Type, ready: false },
  { slug: 'convert', name: 'Convert', short: 'Switch video format', description: 'Convert a video to MP4, MOV, WEBM or MP3 in your browser. The original file stays untouched on your device.', group: 'Convert', tint: 'cyan', icon: FileVideo2, ready: true },
  { slug: 'gif', name: 'Video to GIF', short: 'Bring clips to life', description: 'Turn a video clip into a shareable GIF. Pick your quality and export locally in a few clicks.', group: 'Convert', tint: 'peach', icon: Captions, ready: true },
]

export const languages = [
  { code: 'en', label: 'English' }, { code: 'es', label: 'Español' }, { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' }, { code: 'de', label: 'Deutsch' }, { code: 'ar', label: 'العربية' },
  { code: 'yo', label: 'Yorùbá' }, { code: 'ha', label: 'Hausa' }, { code: 'ig', label: 'Igbo' },
  { code: 'sw', label: 'Kiswahili' },
] as const

export type Locale = typeof languages[number]['code']
