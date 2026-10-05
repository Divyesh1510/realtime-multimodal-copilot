"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert max-w-none text-xs leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeString = String(children).replace(/\n$/, "");

            if (!inline && (match || codeString.includes("\n"))) {
              return <CodeBlock language={language} code={codeString} />;
            }

            return (
              <code
                className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-700/60"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0 text-slate-200">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside space-y-1 my-2 text-slate-300">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside space-y-1 my-2 text-slate-300">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-slate-200">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-sm font-bold text-white border-b border-slate-800 pb-1 mt-3 mb-1.5">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xs font-bold text-white mt-2.5 mb-1 text-indigo-300">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-xs font-semibold text-amber-400 mt-2 mb-1">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-indigo-500 pl-2.5 my-2 text-slate-400 italic bg-slate-900/40 py-1 rounded-r">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2 border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse text-[11px]">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="bg-slate-800/80 p-2 font-semibold text-slate-200 border-b border-slate-700">{children}</th>;
          },
          td({ children }) {
            return <td className="p-2 border-b border-slate-850 text-slate-300">{children}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  return (
    <div className="relative my-2.5 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden group shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
        <span className="uppercase font-semibold tracking-wider text-indigo-400">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition text-[10px]"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <pre className="p-3 overflow-x-auto font-mono text-[11px] text-slate-200 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
        <code>{code}</code>
      </pre>
    </div>
  );
}
