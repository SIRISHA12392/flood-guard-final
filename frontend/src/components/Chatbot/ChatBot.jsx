import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import QuickActions from './QuickActions'
import LanguageToggle from './LanguageToggle'
import { sendMessage, clearChat, playAudioFromBase64 } from '../../services/chatbotAPI'
import './ChatBot.css'

const AUTH_ROUTES = ['/login', '/register', '/']

const ChatBot = () => {
  const { pathname } = useLocation()

  // ── ALL hooks must come before any early return (Rules of Hooks) ──────────
  const [messages, setMessages]         = useState([])
  const [isLoading, setIsLoading]       = useState(false)
  const [language, setLanguage]         = useState('english')
  const [isOpen, setIsOpen]             = useState(false)
  const [isPlaying, setIsPlaying]       = useState(false)
  const messagesEndRef                  = useRef(null)
  const currentAudioRef                 = useRef(null)

  const handleStopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const isAuthPage = AUTH_ROUTES.includes(pathname)

  // ── Welcome message on first open (skipped on auth pages) ────────────────
  useEffect(() => {
    if (isAuthPage) return
    const welcomeText =
      language === 'english'
        ? `👋 Hello! I'm Flood Guard AI Assistant\n\nI can help you with:\n🌊 Flood predictions & information\n⛰️ Landslide warnings & safety\n🚨 Emergency contacts\n📊 Risk assessment\n\nType or speak your question! 🎤`
        : `👋 வணக்கம்! நான் Flood Guard AI உதவியாளர்\n\nநான் உதவ முடியும்:\n🌊 வெள்ள முன்கணிப்புகள்\n⛰️ நிலச்சரிவு எச்சரிக்கைகள்\n🚨 அவசரகால தொடர்புகள்\n📊 அபாய மதிப்பீடு\n\nகேளுங்கள்! 🎤`

    setMessages([
      {
        id:        Date.now(),
        type:      'bot',
        text:      welcomeText,
        language:  language,
        timestamp: new Date(),
      },
    ])
  }, [language, isAuthPage])

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthPage) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAuthPage])

  // ── Guard: don't render UI on auth pages ─────────────────────────────────
  if (isAuthPage) return null

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSendMessage = async (userText, isVoiceInput = false) => {
    if (!userText.trim()) return

    // Stop any currently playing audio before starting a new request
    handleStopAudio()

    const userMsg = {
      id:        Date.now(),
      type:      'user',
      text:      userText,
      language:  language,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const result = await sendMessage(userText, isVoiceInput)

      if (result.success) {
        const botMsg = {
          id:        Date.now() + 1,
          type:      'bot',
          text:      result.response,
          language:  result.language,
          intent:    result.intent,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, botMsg])

        if (isVoiceInput && result.audio?.audio_base64) {
          const audio = playAudioFromBase64(result.audio.audio_base64, result.audio.format)
          if (audio) {
            currentAudioRef.current = audio
            setIsPlaying(true)
            audio.onended = () => setIsPlaying(false)
          }
        }
      } else {
        addErrorMessage()
      }
    } catch {
      addErrorMessage()
    } finally {
      setIsLoading(false)
    }
  }

  // ── Error message ────────────────────────────────────────────────────────
  const addErrorMessage = () => {
    setMessages((prev) => [
      ...prev,
      {
        id:        Date.now(),
        type:      'bot',
        text:
          language === 'english'
            ? '⚠️ Sorry, something went wrong. Please try again.'
            : '⚠️ மன்னிக்கவும், பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
        language:  language,
        timestamp: new Date(),
      },
    ])
  }

  // ── Language change ──────────────────────────────────────────────────────
  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    setMessages((prev) => [
      ...prev,
      {
        id:        Date.now(),
        type:      'system',
        text:      lang === 'english' ? '🇮🇳 Switched to English' : '🇮🇳 தமிழுக்கு மாறினோம்',
        timestamp: new Date(),
      },
    ])
  }

  // ── Clear chat ───────────────────────────────────────────────────────────
  const handleClearChat = async () => {
    if (typeof clearChat === 'function') {
        await clearChat()
    }
    setMessages([
      {
        id:        Date.now(),
        type:      'bot',
        text:      '👋 Chat cleared! How can I help you?',
        language:  language,
        timestamp: new Date(),
      },
    ])
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <button
        className="chatbot-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Flood Guard AI Chat"
      >
        {isOpen ? '✕' : '💬'}
        {!isOpen && <span className="chat-badge">AI</span>}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="chatbot-window">

          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="bot-avatar">🤖</div>
              <div>
                <h3>Flood Guard AI</h3>
                <span className="online-status">
                  <span className="dot" /> Online
                </span>
              </div>
            </div>
            <div className="chatbot-header-right">
              {isPlaying && (
                <button onClick={handleStopAudio} className="header-btn stop-audio-btn" title="Stop Audio">
                  🔇
                </button>
              )}
              <button onClick={handleClearChat} className="header-btn" title="Clear">🗑️</button>
              <button onClick={() => setIsOpen(false)} className="header-btn close-btn">✕</button>
            </div>
          </div>

          {/* Language toggle */}
          <LanguageToggle
            currentLanguage={language}
            onLanguageChange={handleLanguageChange}
          />

          {/* Quick actions */}
          <QuickActions language={language} onQuickAction={handleSendMessage} />

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                voiceEnabled={false}
                language={language}
              />
            ))}

            {isLoading && (
              <div className="typing-indicator">
                <div className="bot-avatar-small">🤖</div>
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>



          {/* Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            language={language}
            isLoading={isLoading}
          />

        </div>
      )}
    </>
  )
}

export default ChatBot
