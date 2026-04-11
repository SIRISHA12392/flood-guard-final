import React, { useState, useEffect } from 'react';

const ChatInput = ({ onSendMessage, language, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Setup Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      
      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        // Automatically send after voice input
        onSendMessage(transcript);
        setInputText('');
        setIsRecording(false);
      };

      recog.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recog.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recog);
    }
  }, [onSendMessage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
    } else {
      if (recognition) {
        recognition.lang = language === 'tamil' ? 'ta-IN' : 'en-IN';
        recognition.start();
        setIsRecording(true);
      } else {
        alert('Voice recognition is not supported in your browser.');
      }
    }
  };

  return (
    <div className="chat-input-container">
      {isRecording && (
        <div className="recording-status active">
          <div className="rec-dot"></div>
          {language === 'tamil' ? 'கேட்கிறது...' : 'Listening...'}
        </div>
      )}
      <form onSubmit={handleSubmit} className="input-row">
        <textarea
          className="chat-textarea"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={language === 'tamil' ? 'உங்கள் கேள்வியைத் தட்டச்சு செய்க...' : 'Type your message...'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows="1"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={toggleRecording}
          className={`voice-btn ${isRecording ? 'recording' : ''}`}
          disabled={isLoading}
          title="Voice input"
        >
          🎤
        </button>
        <button
          type="submit"
          className="send-btn"
          disabled={!inputText.trim() || isLoading}
          title="Send"
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
