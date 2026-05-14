import React, { useState, useEffect } from 'react';

const ChatInput = ({ onSendMessage, language, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  const onSendMessageRef = React.useRef(onSendMessage);
  
  // Keep the ref updated with the latest onSendMessage function
  useEffect(() => {
    onSendMessageRef.current = onSendMessage;
  }, [onSendMessage]);

  useEffect(() => {
    // Setup Speech Recognition only once on mount
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      
      recog.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (interimTranscript !== '') {
          setInputText(interimTranscript);
        }

        if (finalTranscript !== '') {
          setInputText(finalTranscript);
          // Automatically send after voice input finishes
          if (onSendMessageRef.current) {
            onSendMessageRef.current(finalTranscript, true); // true indicates voice input
          }
          setInputText('');
          setIsRecording(false);
          recog.stop();
        }
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
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText, false); // false indicates text input
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
