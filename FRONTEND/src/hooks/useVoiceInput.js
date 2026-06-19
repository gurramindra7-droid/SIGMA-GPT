// src/hooks/useVoiceInput.js
// Voice AI — uses browser's Web Speech API with continuous mode & interim results

import { useState, useRef, useCallback } from "react";

export function useVoiceInput(onTranscript) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [interimText, setInterimText] = useState("");
  const [supported] = useState(
    () => "webkitSpeechRecognition" in window || "SpeechRecognition" in window
  );
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const clearError = useCallback(() => setError(""), []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    setListening(false);
    setInterimText("");
  }, []);

  const startListening = useCallback(() => {
    if (!supported) return;
    setError("");
    setInterimText("");

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Continuous mode with interim results for live transcription
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onend = () => {
      setListening(false);
      setInterimText("");
    };

    recognition.onerror = (event) => {
      setListening(false);
      setInterimText("");
      if (event.error === "not-allowed") {
        setError(
          "Microphone access denied. Allow mic access in browser settings."
        );
      } else if (event.error === "no-speech") {
        setError("No speech detected. Try again.");
      } else if (event.error === "aborted") {
        // User stopped, no error needed
      } else {
        setError("Voice error: " + event.error);
      }
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalText) {
        onTranscript(finalText);
        // Auto-stop after 2 seconds of silence
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
        }, 2000);
      }

      setInterimText(interim);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [supported, onTranscript, stopListening]);

  return {
    listening,
    supported,
    error,
    interimText,
    clearError,
    startListening,
    stopListening,
  };
}
