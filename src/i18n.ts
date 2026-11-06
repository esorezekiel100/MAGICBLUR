import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const english = {
  nav: { tools: 'Tools', convert: 'Convert', pricing: 'Pricing', privacy: 'Privacy', start: 'Start editing' },
  privacy: { badge: 'Your video never leaves your device.' },
}

const translations = Object.fromEntries(
  ['es', 'pt', 'fr', 'de', 'ar', 'yo', 'ha', 'ig', 'sw'].map(locale => [locale, {
    translation: {
      nav: {
        tools: ({ es: 'Herramientas', pt: 'Ferramentas', fr: 'Outils', de: 'Tools', ar: 'الأدوات', yo: 'Àwọn irinṣẹ́', ha: 'Kayan aiki', ig: 'Ngwa', sw: 'Zana' } as Record<string, string>)[locale],
        convert: ({ es: 'Convertir', pt: 'Converter', fr: 'Convertir', de: 'Konvertieren', ar: 'تحويل', yo: 'Yí padà', ha: 'Maida', ig: 'Tụgharịa', sw: 'Badilisha' } as Record<string, string>)[locale],
        pricing: ({ es: 'Precios', pt: 'Preços', fr: 'Tarifs', de: 'Preise', ar: 'الأسعار', yo: 'Iye', ha: 'Farashi', ig: 'Ọnụ ahịa', sw: 'Bei' } as Record<string, string>)[locale],
        privacy: ({ es: 'Privacidad', pt: 'Privacidade', fr: 'Confidentialité', de: 'Datenschutz', ar: 'الخصوصية', yo: 'Àṣírí', ha: 'Sirri', ig: 'Nzuzo', sw: 'Faragha' } as Record<string, string>)[locale],
        start: ({ es: 'Empezar a editar', pt: 'Começar a editar', fr: 'Commencer', de: 'Jetzt bearbeiten', ar: 'ابدأ التعديل', yo: 'Bẹ̀rẹ̀ ṣíṣe àtúnṣe', ha: 'Fara gyarawa', ig: 'Malite dezie', sw: 'Anza kuhariri' } as Record<string, string>)[locale],
      },
      privacy: { badge: ({ es: 'Tu video nunca sale de tu dispositivo.', pt: 'Seu vídeo nunca sai do seu dispositivo.', fr: 'Votre vidéo ne quitte jamais votre appareil.', de: 'Dein Video verlässt niemals dein Gerät.', ar: 'لا يغادر الفيديو جهازك أبدًا.', yo: 'Fídíò rẹ kì í jáde kúrò lórí ẹ̀rọ rẹ.', ha: 'Bidiyonka baya barin na’urarka.', ig: 'Vidiyo gị anaghị apụ na ngwaọrụ gị.', sw: 'Video yako haitoki kwenye kifaa chako.' } as Record<string, string>)[locale] },
    },
  }]),
)

void i18n.use(initReactI18next).init({
  resources: { en: { translation: english }, ...translations },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
