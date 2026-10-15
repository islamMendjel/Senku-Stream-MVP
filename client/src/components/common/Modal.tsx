import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badgeText?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  badgeText,
  children,
  maxWidth = 'max-w-2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full ${maxWidth} bg-surface/95 border border-borderDim rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] hypr-active-border`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-borderDim bg-surfaceLight/40">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-portal animate-pulse-glow" />
            <h2 className="text-sm font-mono font-semibold tracking-wider text-textBright uppercase">
              {title}
            </h2>
            {badgeText && (
              <span className="text-[11px] font-mono text-cyanNeon bg-cyanNeon/10 border border-cyanNeon/30 px-2 py-0.5 rounded">
                [ {badgeText} ]
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-textMuted hover:text-textBright hover:bg-borderDim/50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
