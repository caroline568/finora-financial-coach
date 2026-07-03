import React from 'react';

// Basic markdown-like parser for bold text specifically requested in the prompt
export function FormattedMessage({ content }: { content: string }) {
  if (!content) return null;

  // Split by newlines first to handle paragraphs
  const paragraphs = content.split('\n');

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, i) => {
        if (!paragraph.trim()) return null;
        
        // Handle bold parsing **text**
        const parts = paragraph.split(/(\*\*.*?\*\*)/g);
        
        return (
          <p key={i} className="leading-relaxed">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const innerText = part.slice(2, -2);
                return <strong key={j} className="font-semibold text-foreground">{innerText}</strong>;
              }
              return <React.Fragment key={j}>{part}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
}
