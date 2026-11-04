import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ClickableTextProps {
  text: string;
  onOpenLink?: (url: string) => void;
  className?: string;
}

export const ClickableText: React.FC<ClickableTextProps> = ({ text, onOpenLink, className = '' }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(/^https?:\/\//i)) {
          if (onOpenLink) {
            return (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLink(part);
                }}
                className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer inline-flex items-center gap-0.5 break-all text-left"
                title="Открыть ссылку в браузере"
              >
                <span>{part}</span>
                <ExternalLink className="w-3 h-3 inline shrink-0 ml-0.5 opacity-80" />
              </button>
            );
          }
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline font-medium break-all"
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
