import React from 'react';
import { Sparkles, Terminal, ChevronRight, AlertCircle } from 'lucide-react';

/**
 * Parses inline formatting like **bold**, `code`, and *italic*
 */
const renderInlineTokens = (text, isUser = false) => {
  if (!text) return null;

  // Split by inline code first: `code`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((codePart, cIdx) => {
    if (codePart.startsWith('`') && codePart.endsWith('`') && codePart.length >= 2) {
      const codeContent = codePart.slice(1, -1);
      return (
        <code
          key={cIdx}
          className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold border ${
            isUser
              ? 'bg-[#24140b] text-[#fbf7f0] border-white/20'
              : 'bg-[#ebdccb] text-[#24140b] border-[#4a2e1b]/30'
          }`}
        >
          {codeContent}
        </code>
      );
    }

    // Next handle **bold**
    const boldParts = codePart.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((boldPart, bIdx) => {
      if (boldPart.startsWith('**') && boldPart.endsWith('**') && boldPart.length >= 4) {
        const boldContent = boldPart.slice(2, -2);
        return (
          <strong key={`${cIdx}-${bIdx}`} className={isUser ? 'font-bold text-white' : 'font-bold text-[#161514]'}>
            {boldContent}
          </strong>
        );
      }

      // Handle *italic*
      const italicParts = boldPart.split(/(\*[^*]+\*)/g);
      return italicParts.map((itPart, iIdx) => {
        if (itPart.startsWith('*') && itPart.endsWith('*') && itPart.length >= 2) {
          const itContent = itPart.slice(1, -1);
          return (
            <em key={`${cIdx}-${bIdx}-${iIdx}`} className="italic opacity-90">
              {itContent}
            </em>
          );
        }
        return itPart;
      });
    });
  });
};

/**
 * Strips outer markdown asterisks/hashes from titles
 */
const cleanTitle = (raw) => {
  return raw.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
};

export const StructuredMarkdown = ({ content, isUser = false }) => {
  if (!content) return null;

  // If message is from user, display with clean paragraph spacing
  if (isUser) {
    return (
      <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed text-[#fbf7f0]">
        {content}
      </div>
    );
  }

  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockLines = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code Blocks (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <div key={`code-${i}`} className="my-2.5 rounded-xl bg-[#1a1816] border border-[#24140b] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-3 py-1 bg-[#24140b] text-[10px] font-mono text-[#d5bfae]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-purple-400" />
                {codeBlockLang || 'TELEMETRY / SCRIPT'}
              </span>
            </div>
            <pre className="p-3 text-xs font-mono text-[#fbf7f0] overflow-x-auto leading-relaxed">
              <code>{codeBlockLines.join('\n')}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        // Start code block
        inCodeBlock = true;
        codeBlockLang = trimmed.replace(/^```/, '').trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Empty line
    if (!trimmed) {
      continue;
    }

    // 2. Horizontal Divider (---, ***)
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-t-2 border-[#4a2e1b]/15" />);
      continue;
    }

    // 3. Main Headings (### or ## or #)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const title = cleanTitle(trimmed);
      elements.push(
        <div
          key={`h-${i}`}
          className="flex items-center gap-2 mt-3.5 mb-2 pb-1.5 border-b border-[#4a2e1b]/20"
        >
          <span className="w-1.5 h-4 rounded-full bg-purple-700 shrink-0" />
          <h3 className="font-display font-bold text-xs sm:text-sm text-[#24140b] uppercase tracking-wider">
            {renderInlineTokens(title, isUser)}
          </h3>
        </div>
      );
      continue;
    }

    // 4. Bold Section Headers (e.g. **1. Operational Context** or **Objective:**)
    if (/^\*\*\d+\..*\*\*$/.test(trimmed)) {
      const sectionName = trimmed.replace(/^\*\*|\*\*$/g, '');
      elements.push(
        <div key={`sec-${i}`} className="font-display font-bold text-xs text-purple-900 mt-2.5 mb-1.5 flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-[10px] font-bold border border-purple-300">
            PHASE
          </span>
          <span>{renderInlineTokens(sectionName, isUser)}</span>
        </div>
      );
      continue;
    }

    // 5. Blockquotes (> Warning / > Note)
    if (trimmed.startsWith('>')) {
      const quoteContent = trimmed.replace(/^>\s*/, '');
      elements.push(
        <div
          key={`quote-${i}`}
          className="my-2 p-2.5 rounded-xl bg-purple-50/80 border-l-4 border-purple-700 text-xs font-mono text-purple-950 flex items-start gap-2 shadow-xs"
        >
          <AlertCircle className="w-3.5 h-3.5 text-purple-700 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{renderInlineTokens(quoteContent, isUser)}</div>
        </div>
      );
      continue;
    }

    // 6. Numbered Lists (1. item, 2. item)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const [, num, itemContent] = numMatch;
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5 pl-1">
          <span className="px-1.5 py-0.2 rounded bg-[#ebdccb] text-[#4a2e1b] font-mono text-[10px] font-bold border border-[#4a2e1b]/30 shrink-0 mt-0.5">
            {num}
          </span>
          <div className="text-xs font-sans text-[#24140b] leading-relaxed flex-1">
            {renderInlineTokens(itemContent, isUser)}
          </div>
        </div>
      );
      continue;
    }

    // 7. Bullet Lists (* item, - item, • item)
    if (/^[\*\-•]\s+/.test(trimmed)) {
      const itemContent = trimmed.replace(/^[\*\-•]\s+/, '');
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-700 shrink-0 mt-1.5" />
          <div className="text-xs font-sans text-[#24140b] leading-relaxed flex-1">
            {renderInlineTokens(itemContent, isUser)}
          </div>
        </div>
      );
      continue;
    }

    // 8. Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs font-sans text-[#24140b] leading-relaxed my-1.5">
        {renderInlineTokens(rawLine, isUser)}
      </p>
    );
  }

  // Handle unclosed code block if message was truncated
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <div key="code-unclosed" className="my-2.5 rounded-xl bg-[#1a1816] border border-[#24140b] overflow-hidden">
        <pre className="p-3 text-xs font-mono text-[#fbf7f0] overflow-x-auto leading-relaxed">
          <code>{codeBlockLines.join('\n')}</code>
        </pre>
      </div>
    );
  }

  return <div className="flex flex-col">{elements}</div>;
};
