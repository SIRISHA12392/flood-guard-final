import React, { useState } from 'react'
import { textToSpeech, playAudioFromBase64 } from '../../services/chatbotAPI'

const ChatMessage = ({ message, voiceEnabled, language }) => {
  const [isSpeaking, setIsSpeaking] = useState(false)

  const handleSpeak = async () => {
    if (isSpeaking) return
    setIsSpeaking(true)
    try {
      const result = await textToSpeech(message.text, message.language)
      if (result.success && result.audio_base64) {
        const audio = playAudioFromBase64(result.audio_base64, result.format)
        if (audio) audio.onended = () => setIsSpeaking(false)
      }
    } catch (err) {
      console.error('Speak error:', err)
    } finally {
      setTimeout(() => setIsSpeaking(false), 3000)
    }
  }

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })

  // ── Rich structured renderer ──────────────────────────────────────
  const renderBotText = (text) => {
    if (!text) return null
    const lines = text.split('\n')
    const elements = []
    let key = 0

    // Inline risk highlight
    const inlineRisk = (str) => {
      const parts = str.split(/(\bHigh\b|\bMedium\b|\bLow\b)/gi)
      return parts.map((w, i) => {
        if (/^High$/i.test(w))   return <span key={i} style={{ color: '#ff4444', fontWeight: 700 }}>{w}</span>
        if (/^Medium$/i.test(w)) return <span key={i} style={{ color: '#ffaa00', fontWeight: 700 }}>{w}</span>
        if (/^Low$/i.test(w))    return <span key={i} style={{ color: '#00cc66', fontWeight: 700 }}>{w}</span>
        return w
      })
    }

    // Phone number link  (112, 1078, 1070, 100, 101, 108 etc.)
    const inlinePhone = (str) => {
      const parts = str.split(/(\b(?:112|1078|1070|100|101|108|1091|1098)\b)/g)
      return parts.map((p, i) =>
        /^\d{3,4}$/.test(p) && parseInt(p) <= 2000
          ? <a key={i} href={`tel:${p}`} style={{ color: '#64c8ff', fontWeight: 700, textDecoration: 'none' }}>{p}</a>
          : inlineRisk(p)
      )
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // blank line
      if (line.trim() === '') {
        elements.push(<div key={key++} style={{ height: 5 }} />)
        continue
      }

      // Tamil section divider
      if (/^Tamil:?\s*$/.test(line.trim())) {
        elements.push(
          <div key={key++} style={{
            color: '#ffcc44', fontWeight: 700, fontSize: '0.72rem',
            borderTop: '1px solid rgba(255,200,0,0.2)',
            paddingTop: 5, marginTop: 5
          }}>
            {line.trim()}
          </div>
        )
        continue
      }

      // Tamil sub-section  e.g. "Tamil - Before:"
      if (/^Tamil\s*[-–].+/.test(line.trim())) {
        elements.push(
          <div key={key++} style={{ color: '#ffcc44', fontWeight: 600, fontSize: '0.72rem', marginTop: 4 }}>
            {line.trim()}
          </div>
        )
        continue
      }

      // Section heading — ALL CAPS with colon  OR  Title Case ending with colon
      const isHeading =
        /^[A-Z][A-Z\s&\-]{3,}:/.test(line) ||
        /^[A-Z][a-zA-Z\s&\-]+:$/.test(line)

      if (isHeading) {
        elements.push(
          <div key={key++} style={{
            color: '#64c8ff', fontWeight: 700, fontSize: '0.78rem',
            marginTop: 7, marginBottom: 1
          }}>
            {inlinePhone(line)}
          </div>
        )
        continue
      }

      // Numbered list  "1. …"
      if (/^\d+\.\s/.test(line)) {
        const num     = line.match(/^(\d+)\./)[1]
        const content = line.replace(/^\d+\.\s*/, '')
        elements.push(
          <div key={key++} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', paddingLeft: 4, marginTop: 2 }}>
            <span style={{ color: '#0099ff', flexShrink: 0, fontWeight: 700, fontSize: '0.8rem' }}>{num}.</span>
            <span style={{ fontSize: '0.8rem', lineHeight: 1.55 }}>{inlinePhone(content)}</span>
          </div>
        )
        continue
      }

      // Top-level bullet  "- …" or "•…"
      if (/^[-•]\s/.test(line)) {
        const content = line.replace(/^[-•]\s*/, '')
        elements.push(
          <div key={key++} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', paddingLeft: 4, marginTop: 2 }}>
            <span style={{ color: '#0099ff', flexShrink: 0 }}>•</span>
            <span style={{ fontSize: '0.8rem', lineHeight: 1.55 }}>{inlinePhone(content)}</span>
          </div>
        )
        continue
      }

      // Indented bullet  "   - …"
      if (/^ {2,}[-•]\s/.test(line)) {
        const content = line.replace(/^ +[-•]\s*/, '')
        elements.push(
          <div key={key++} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', paddingLeft: 18, marginTop: 1 }}>
            <span style={{ color: '#aaaaaa', flexShrink: 0 }}>›</span>
            <span style={{ fontSize: '0.77rem', lineHeight: 1.5 }}>{inlinePhone(content)}</span>
          </div>
        )
        continue
      }

      // Default line
      elements.push(
        <div key={key++} style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
          {inlinePhone(line)}
        </div>
      )
    }

    return elements
  }

  // System message
  if (message.type === 'system') {
    return (
      <div className="system-msg">
        <span>{message.text}</span>
      </div>
    )
  }

  // User message
  if (message.type === 'user') {
    return (
      <div className="message-wrapper user-wrapper">
        <div className="message user-message">
          <p>{message.text}</p>
        </div>
        <div className="message-meta user-meta">
          {formatTime(message.timestamp)}
        </div>
      </div>
    )
  }

  // Bot message
  return (
    <div className="message-wrapper bot-wrapper">
      <div className="bot-avatar-small">🤖</div>
      <div className="bot-message-content">
        <div className="message bot-message">
          {renderBotText(message.text)}
        </div>
        <div className="message-meta bot-meta">
          <span>{formatTime(message.timestamp)}</span>
          <span className="lang-badge">
            {message.language === 'tamil' ? '🇮🇳 Tamil' : '🇮🇳 EN'}
          </span>
          <button
            className={`speak-btn ${isSpeaking ? 'speaking' : ''}`}
            onClick={handleSpeak}
            disabled={isSpeaking}
          >
            {isSpeaking ? '🔊 Speaking...' : '🔊 Listen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatMessage
