// src/hooks/useVoiceInput.js
// Stage 6: Voice AI — uses browser's Web Speech API (no extra package needed)

import { useState, useRef } from "react";

export function useVoiceInput(onTranscript) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [supported] = useState(() => "webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  const recognitionRef = useRef(null);

  const startListening = () => {
    if (!supported) return;
    setError("");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Allow mic access in browser settings.");
      } else if (event.error === "no-speech") {
        setError("No speech detected. Try again.");
      } else {
        setError(`Voice error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const clearError = () => setError("");

  return { listening, supported, error, clearError, startListening, stopListening };
}