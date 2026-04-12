// chatbotAPI.js
// Handles communication between the React frontend and the Flask backend

// Uses VITE_API_URL env variable (set to your Render backend URL in production)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const sendMessage = async (text, voiceEnabled = true) => {
  try {
    const response = await fetch(`${API_URL}/chatbot/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, voice: voiceEnabled })
    });
    
    if (!response.ok) {
       throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Chat API Error:", error);
    return { success: false, error: error.message };
  }
};

export const clearChat = async () => {
  try {
    const response = await fetch(`${API_URL}/chatbot/clear`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    console.error("Clear Chat API Error:", error);
    return { success: false };
  }
};

export const setLanguage = async (language) => {
  try {
    const response = await fetch(`${API_URL}/chatbot/set_language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: language })
    });
    return await response.json();
  } catch(error) {
    console.error("Set Language API Error:", error);
    return { success: false };
  }
};

export const playAudioFromBase64 = (base64Audio, format = 'mp3') => {
  if (!base64Audio) return null;
  try {
     const audio = new Audio(`data:audio/${format};base64,${base64Audio}`);
     audio.play().catch(e => console.error("Audio playback failed:", e));
     return audio;
  } catch (err) {
     console.error("Audio instantiation failed:", err);
     return null;
  }
};

export const textToSpeech = async (text, language) => {
  try {
    const response = await fetch(`${API_URL}/chatbot/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language })
    });
    return await response.json();
  } catch (error) {
    console.error("TTS API Error:", error);
    return { success: false, error: error.message };
  }
};
