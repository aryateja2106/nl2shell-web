"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { AudioVisualizer } from "@/components/audio-visualizer";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    start,
    stop,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      onTranscriptRef.current(transcript);
    }
  }, [transcript]);

  if (!isSupported) {
    return (
      <p className="text-xs text-muted-foreground">
        Voice input requires Chrome or Edge.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="lg"
        onClick={isListening ? stop : start}
        disabled={disabled}
        className="relative"
        aria-pressed={isListening}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
      >
        {isListening ? (
          <>
            <MicOffIcon className="mr-2 size-4" />
            Stop
          </>
        ) : (
          <>
            <MicIcon className="mr-2 size-4" />
            Speak
          </>
        )}
      </Button>

      {isListening && <AudioVisualizer />}

      {interimTranscript && (
        <span className="text-sm text-muted-foreground italic animate-pulse" aria-live="polite">
          {interimTranscript}
        </span>
      )}
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5.29" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
