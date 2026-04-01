"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSpeechRecognition, isSpeechSupported } from "@/lib/speech";

export function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isSpeechSupported());
  }, []);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
    if (!isSpeechSupported()) return;

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    setTranscript("");
    setInterimTranscript("");

    const recognition = createSpeechRecognition({
      lang: "en-US",
      continuous: false,
      interimResults: true,
      onResult: (text, isFinal) => {
        if (isFinal) {
          setTranscript(text);
          setInterimTranscript("");
        } else {
          setInterimTranscript(text);
        }
      },
      onError: (error) => {
        console.error("Speech recognition error:", error);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    start,
    stop,
  };
}
