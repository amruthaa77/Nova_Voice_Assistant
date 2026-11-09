import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AssistantStatus } from '../../api/types';

interface SpeechBubbleProps {
  status: AssistantStatus;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  status,
  errorMessage,
  onRetry,
}) => {
  // Section 1 requirement: hide the bubble while speaking (transcript shows the words)
  if (status === 'speaking') {
    return null;
  }

  // Section 1 requirement: show idle greeting for the first few seconds,
  // then settle into the shorter hint "Tap me to talk."
  const [isSettled, setIsSettled] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'idle') {
      setIsSettled(false);
      const timer = setTimeout(() => {
        setIsSettled(true);
      }, 4200);
      return () => clearTimeout(timer);
    } else {
      setIsSettled(false);
    }
  }, [status]);

  const getBubbleContent = () => {
    switch (status) {
      case 'connecting':
        return {
          title: 'Hold on, getting ready...',
          emoji: '⏳',
        };
      case 'listening':
        return {
          title: "Go ahead, I'm listening.",
          emoji: '🎙️',
        };
      case 'thinking':
        return {
          title: 'Hmm, let me think...',
          emoji: '💭',
        };
      case 'error':
        return {
          title: errorMessage
            ? errorMessage.length > 50
              ? "I can't hear you. Check your mic."
              : errorMessage
            : "I can't hear you. Check your mic.",
          emoji: '⚠️',
          action: 'Try again',
        };
      case 'idle':
      default:
        return {
          title: isSettled
            ? 'Tap me to talk.'
            : "Hi, I'm Nova, your helpful assistant! 👋",
          emoji: '',
        };
    }
  };

  const content = getBubbleContent();

  return (
    <div className="relative inline-block select-none pointer-events-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={status + (content.title || '')}
          initial={{ opacity: 0, scale: 0.88, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          className="relative bg-white text-[#151226] px-4 py-2.5 sm:px-5 sm:py-3 rounded-[20px] shadow-bubble border border-white/60 flex items-center gap-2 max-w-[240px]"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold leading-snug tracking-tight text-[#17142b] break-words">
              {content.title} {content.emoji}
            </p>
            {content.action && onRetry && (
              <button
                onClick={onRetry}
                className="mt-1 text-xs font-bold text-orange-600 hover:text-orange-700 underline tracking-wide cursor-pointer"
              >
                {content.action}
              </button>
            )}
          </div>

          {/* Trailing comic dots pointing down toward Nova mascot */}
          <div className="absolute -bottom-2.5 left-4 flex flex-col items-center">
            <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
            <div className="w-1.5 h-1.5 bg-white rounded-full mt-0.5 -ml-1.5 shadow-sm" />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
