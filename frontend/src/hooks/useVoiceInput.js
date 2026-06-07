import { useState, useRef, useCallback } from 'react'

const ERR_MSGS = {
  'not-allowed'      : 'MIC BLOCKED — allow in browser settings',
  'audio-capture'    : 'NO MIC DETECTED',
  'no-speech'        : 'NO SPEECH — try again',
  'network'          : 'NETWORK ERROR',
  'aborted'          : 'ABORTED',
  'service-not-allowed': 'BLOCKED — allow mic in settings',
}

export function useVoiceInput(onFinalText) {
  const [voiceState,  setVoiceState]  = useState('ready')
  const [statusMsg,   setStatusMsg]   = useState('VOICE READY')
  const [interimText, setInterimText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recogRef = useRef(null)
  const finalRef = useRef('')

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null

  const setVS = useCallback((state, msg) => {
    setVoiceState(state)
    if (msg !== undefined) setStatusMsg(msg)
  }, [])

  const buildRecog = useCallback(() => {
    const r = new SR()
    r.lang = 'en-US'; r.continuous = false
    r.interimResults = true; r.maxAlternatives = 1

    r.onstart       = () => { setIsListening(true); finalRef.current = ''; setInterimText(''); setVS('listen','● LISTENING...') }
    r.onspeechstart = () => setVS('speech', '● HEARING SPEECH...')
    r.onresult      = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      setInterimText(interim)
    }
    r.onspeechend   = () => setVS('process', '◌ PROCESSING...')
    r.onend         = () => {
      setIsListening(false); setInterimText('')
      const txt = finalRef.current.trim()
      if (txt) { setVS('ready','VOICE READY'); onFinalText(txt) }
      else setVS('ready','VOICE READY')
      finalRef.current = ''; recogRef.current = null
    }
    r.onerror = (e) => {
      setIsListening(false); setInterimText(''); finalRef.current = ''; recogRef.current = null
      setVS('error', ERR_MSGS[e.error] || 'ERROR: ' + e.error.toUpperCase())
      setTimeout(() => setVS('ready','VOICE READY'), 4000)
    }
    return r
  }, [SR, onFinalText, setVS])

  const toggleListen = useCallback(async () => {
    if (!SR) return
    if (isListening) {
      recogRef.current?.stop()
      setIsListening(false); setVS('ready','VOICE READY'); return
    }
    if (navigator.permissions) {
      try {
        const p = await navigator.permissions.query({ name: 'microphone' })
        if (p.state === 'denied') { setVS('error','MIC BLOCKED'); setTimeout(() => setVS('ready','VOICE READY'), 4000); return }
      } catch (_) {}
    }
    try { recogRef.current = buildRecog(); recogRef.current.start() }
    catch (e) { setVS('error','FAILED TO START'); setTimeout(() => setVS('ready','VOICE READY'), 3000) }
  }, [SR, isListening, buildRecog, setVS])

  return { voiceState, statusMsg, interimText, isListening, toggleListen, supported: !!SR }
}
