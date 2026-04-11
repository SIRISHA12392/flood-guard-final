import os
import base64
import tempfile

class VoiceHandler:

    def __init__(self):
        pass

    # ===== TEXT TO SPEECH =====
    def text_to_speech(self, text, language="english"):
        try:
            from gtts import gTTS

            clean_text = self.clean_text(text)
            lang_code = "en" if language == "english" else "ta"

            tts = gTTS(text=clean_text, lang=lang_code, slow=False)

            temp_file = tempfile.NamedTemporaryFile(
                delete=False, suffix='.mp3'
            )
            tts.save(temp_file.name)

            with open(temp_file.name, 'rb') as f:
                audio_data = base64.b64encode(f.read()).decode('utf-8')

            os.unlink(temp_file.name)

            return {
                "success": True,
                "audio_base64": audio_data,
                "format": "mp3"
            }

        except Exception as e:
            print(f"TTS Error: {e}")
            return {"success": False, "error": str(e)}

    # ===== PROCESS AUDIO BLOB =====
    def process_audio_blob(self, audio_blob, language="english"):
        try:
            import speech_recognition as sr

            audio_data = base64.b64decode(audio_blob)

            temp_file = tempfile.NamedTemporaryFile(
                delete=False, suffix='.wav'
            )
            temp_file.write(audio_data)
            temp_file.close()

            recognizer = sr.Recognizer()
            lang_code = "en-IN" if language == "english" else "ta-IN"

            with sr.AudioFile(temp_file.name) as source:
                audio = recognizer.record(source)

            text = recognizer.recognize_google(audio, language=lang_code)
            os.unlink(temp_file.name)

            return {"success": True, "text": text}

        except Exception as e:
            return {"success": False, "error": str(e)}

    # ===== CLEAN TEXT =====
    def clean_text(self, text):
        import re
        # Clean markdown asterisks
        text = re.sub(r'\*(.*?)\*', r'\1', text)
        # Remove common emojis
        text = re.sub(r'[🌊⛰️📊🛡️🚨✅⛔⚠️👋📞🎤🤖]', '', text)
        text = re.sub(r'•\s', ', ', text)
        text = re.sub(r'\n+', '. ', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
