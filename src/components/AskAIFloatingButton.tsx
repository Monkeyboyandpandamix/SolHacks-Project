import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

const AskAIFloatingButton: React.FC = () => {
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);

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

  const handleAskAI = () => {
    if (selection) {
      window.dispatchEvent(new CustomEvent('ask-ai', { detail: selection.text }));
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <AnimatePresence>
      {selection && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          onClick={handleAskAI}
          style={{
            position: 'absolute',
            left: selection.x,
            top: selection.y,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-[100] flex items-center gap-2 rounded-full bg-indigo-950 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-200 transition-transform active:scale-95"
        >
          <Sparkles size={14} className="text-amber-400" />
          Ask AI
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default AskAIFloatingButton;
