import { useState, useRef, useCallback, useEffect } from 'react'

const VOICE_PREFS = {
  female : [v => /zira.*natural/i.test(v.name), v => /zira/i.test(v.name), v => /samantha/i.test(v.name), v => /en-US/i.test(v.lang)],
  male   : [v => /david.*natural/i.test(v.name), v => /mark.*natural/i.test(v.name), v => /david/i.test(v.name), v => /en-US/i.test(v.lang)],
  vijay  : [v => /ravi/i.test(v.name), v => /en-IN/i.test(v.lang), v => /en-US/i.test(v.lang)],
  tamil  : [v => /valluvar/i.test(v.name), v => /ta-IN/i.test(v.lang), v => /en-IN/i.test(v.lang)],
}

const VOICE_CFG = {
  female : { pitch:1.1,  rate:0.95 },
  male   : { pitch:0.82, rate:0.9  },
  vijay  : { pitch:0.6,  rate:0.8  },
  tamil  : { pitch:0.75, rate:0.85 },
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices,     setVoices]     = useState([])
  const [voiceMode,  setVoiceMode]  = useState(localStorage.getItem('tony_vm') || 'female')
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const ttsVoiceRef = useRef(null)
  const synthRef    = useRef(window.speechSynthesis || null)

  const loadVoices = useCallback(() => {
    const synth = synthRef.current; if (!synth) return
    const vs = synth.getVoices(); setVoices(vs)
    const prefs = VOICE_PREFS[voiceMode] || VOICE_PREFS.female
    for (const p of prefs) { const m = vs.find(p); if (m) { ttsVoiceRef.current = m; return } }
    ttsVoiceRef.current = vs[0] || null
  }, [voiceMode])

  useEffect(() => {
    const synth = synthRef.current; if (!synth) return
    synth.onvoiceschanged = loadVoices; loadVoices()
  }, [loadVoices])

  const cycleVoice = useCallback(() => {
    const cycle = { female:'male', male:'vijay', vijay:'tamil', tamil:'female' }
    const next = cycle[voiceMode] || 'female'
    setVoiceMode(next); localStorage.setItem('tony_vm', next)
  }, [voiceMode])

  const speak = useCallback((text) => {
    const synth = synthRef.current; if (!synth || !ttsEnabled) return
    synth.cancel()
    const clean = text.replace(/<[^>]*>/g,'').replace(/```[\s\S]*?```/g,' code block ').replace(/`([^`]+)`/g,'$1').substring(0,300)
    const u = new SpeechSynthesisUtterance(clean)
    u.voice  = ttsVoiceRef.current
    const cfg = VOICE_CFG[voiceMode] || VOICE_CFG.female
    u.pitch  = cfg.pitch; u.rate = cfg.rate; u.volume = 1.0
    u.lang   = (voiceMode === 'tamil' && ttsVoiceRef.current && /ta/i.test(ttsVoiceRef.current.lang)) ? 'ta-IN' : 'en-US'
    u.onstart = () => setIsSpeaking(true)
    u.onend   = u.onerror = () => setIsSpeaking(false)
    synth.speak(u)
  }, [ttsEnabled, voiceMode])

  const stop = useCallback(() => { synthRef.current?.cancel(); setIsSpeaking(false) }, [])

  const toggle = useCallback(() => {
    const next = !ttsEnabled; setTtsEnabled(next)
    if (!next) stop()
  }, [ttsEnabled, stop])

  const LABELS = { female:'FEMALE', male:'MALE', vijay:'VIJAY', tamil:'TAMIL' }

  return { isSpeaking, speak, stop, toggle, cycleVoice, ttsEnabled, voiceMode, voiceLabel: LABELS[voiceMode], voices }
}
