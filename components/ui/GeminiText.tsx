"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type Props = {
  children: string;
  className?: string;
};

/**
 * Renders Gemini (or other LLM) text with markdown + KaTeX math ($...$, $$...$$).
 */
export function GeminiText({ children, className = "" }: Props) {
  const text = children ?? "";

  return (
    <div className={`gemini-md ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
