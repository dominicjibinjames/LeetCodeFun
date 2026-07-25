"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { indentWithTab } from "@codemirror/commands";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

/** Near-white parchment editor — high-contrast ink on light paper. */
const parchmentTheme = EditorView.theme(
  {
    "&": {
      color: "#2a2118",
      backgroundColor: "#fffdf8",
      fontSize: "13px",
      minHeight: "320px",
    },
    ".cm-content": {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      caretColor: "#2a2118",
      padding: "8px 0",
      color: "#2a2118",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#2a2118",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "rgba(176, 137, 61, 0.35)",
    },
    ".cm-gutters": {
      backgroundColor: "#f3e6c8",
      color: "#5c4a38",
      border: "none",
      borderRight: "1px solid #c9a86a",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#e4d2a8",
      color: "#2a2118",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(228, 210, 168, 0.45)",
    },
    ".cm-scroller": {
      overflow: "auto",
      minHeight: "320px",
      backgroundColor: "#fffdf8",
    },
    ".cm-placeholder": {
      color: "#8a7a68",
    },
  },
  { dark: false },
);

const parchmentHighlight = HighlightStyle.define([
  { tag: t.comment, color: "#8a7a68", fontStyle: "italic" },
  { tag: t.keyword, color: "#9a3f14", fontWeight: "600" },
  { tag: [t.string, t.special(t.string)], color: "#3d5c45" },
  { tag: t.number, color: "#c45c26" },
  { tag: [t.bool, t.null], color: "#9a3f14" },
  { tag: t.operator, color: "#5c4a38" },
  { tag: t.punctuation, color: "#5c4a38" },
  { tag: [t.paren, t.bracket, t.brace], color: "#5c4a38" },
  { tag: t.function(t.definition(t.variableName)), color: "#1a4a6e" },
  { tag: t.definition(t.variableName), color: "#2a2118" },
  { tag: t.variableName, color: "#2a2118" },
  { tag: t.function(t.variableName), color: "#1a4a6e" },
  { tag: [t.typeName, t.className], color: "#6b4f2a" },
  { tag: t.propertyName, color: "#2a2118" },
  { tag: t.meta, color: "#5c4a38" },
  { tag: t.invalid, color: "#c45c26" },
]);

const extensions = [
  python(),
  lineNumbers(),
  keymap.of([indentWithTab]),
  EditorView.lineWrapping,
  parchmentTheme,
  syntaxHighlighting(parchmentHighlight),
];

export function CodeStep({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-display text-[var(--ink-muted)]">
        Python (no execution — paste on LeetCode when ready)
      </label>
      <p className="text-xs text-[var(--ink-muted)] leading-snug">
        Write the full solution from scratch: function signature plus any{" "}
        <code className="text-[11px]">ListNode</code> / <code className="text-[11px]">TreeNode</code>{" "}
        / helpers yourself.
      </p>
      <div className="overflow-hidden rounded border border-[#c9a86a] bg-[#fffdf8] shadow-inner">
        <CodeMirror
          value={value}
          height="320px"
          theme="none"
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            indentOnInput: true,
            tabSize: 4,
            syntaxHighlighting: false,
          }}
          extensions={extensions}
          onChange={onChange}
          placeholder="# def solution(...):"
        />
      </div>
    </div>
  );
}
