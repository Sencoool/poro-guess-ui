import React, { useEffect } from "react";

interface TutorialModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

export default function TutorialModal({ show, onClose, title, content }: TutorialModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 z-50 animate-fade-in backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="pointer-events-auto relative w-full max-w-md bg-[#1E293B] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          style={{
            animation: "answerDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-blue-400">ℹ️</span> {title}
            </h2>
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 text-zinc-300 space-y-4 max-h-[70vh] overflow-y-auto">
            {content}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-black/20 border-t border-white/10 flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
