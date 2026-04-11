import React from 'react'
import { setLanguage } from '../../services/chatbotAPI'

const LanguageToggle = ({ currentLanguage, onLanguageChange }) => {
  const handleChange = async (lang) => {
    // If you don't have setLanguage exported specifically it might fail, 
    // but assuming it is exported from chatbotAPI based on user code!
    if (typeof setLanguage === 'function') {
      await setLanguage(lang)
    }
    onLanguageChange(lang)
  }

  return (
    <div className="language-toggle-bar">
      <span className="lang-label">Language:</span>
      <button
        className={`lang-chip ${currentLanguage === 'english' ? 'active' : ''}`}
        onClick={() => handleChange('english')}
      >
        🇮🇳 English
      </button>
      <button
        className={`lang-chip ${currentLanguage === 'tamil' ? 'active' : ''}`}
        onClick={() => handleChange('tamil')}
      >
        🇮🇳 தமிழ்
      </button>
    </div>
  )
}

export default LanguageToggle
