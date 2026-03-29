import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Volume2 } from 'lucide-react';

const AskAIFloatingButton: React.FC = () => {
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [isReading, setIsReading] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.toString().trim().length === 0) {
        setSelection(null);
      }
    };

    const handleMouseUp = () => {
      // Use setTimeout to ensure selection is registered properly
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelection({
            text: sel.toString().trim(),
            x: rect.left + rect.width / 2,
            // Adjust to align just above the selection
            y: rect.top + window.scrollY - 10,
          });
        }
      }, 50);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const handleAskAI = () => {
    if (selection) {
      window.dispatchEvent(new CustomEvent('ask-ai', { detail: selection.text }));
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const speakWithBrowserFallback = React.useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);
    window.speechSynthesis.speak(utterance);
    setIsReading(true);
  }, []);

  const handleReadAloud = async () => {
    if (!selection || isReading) return;

    try {
      const response = await fetch('/api/voice/readaloud', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selection.text,
          language: 'English',
        }),
      });

      if (!response.ok) {
        throw new Error('ElevenLabs request failed');
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setIsReading(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        speakWithBrowserFallback(selection.text);
      };

      setIsReading(true);
      await audio.play();
    } catch {
      speakWithBrowserFallback(selection.text);
    }
  };

  return (
    <AnimatePresence>
      {selection && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          style={{
            position: 'absolute',
            left: selection.x,
            top: selection.y,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-[100] flex items-center gap-2"
        >
          <button
            onClick={handleAskAI}
            className="flex items-center gap-2 rounded-full bg-indigo-950 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-200 transition-transform active:scale-95"
          >
            <Sparkles size={14} className="text-amber-400" />
            Ask AI
          </button>
          <button
            onClick={handleReadAloud}
            className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-200 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isReading}
          >
            <Volume2 size={14} />
            {isReading ? 'READING' : 'READ ALOUD'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AskAIFloatingButton;
