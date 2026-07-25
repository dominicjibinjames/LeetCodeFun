"use client";

import { ALL_PATTERNS, PATTERN_LABELS } from "@/lib/districts";

type Props = {
  value: string;
  onChange: (value: string) => void;
  allowFreeText?: boolean;
};

export function PatternSelect({ value, onChange, allowFreeText = true }: Props) {
  const known = ALL_PATTERNS.includes(value);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-display text-[var(--ink-muted)]">
        Pattern ID
      </label>
      <select
        value={known ? value : "__other__"}
        onChange={(e) => {
          if (e.target.value === "__other__") onChange("");
          else onChange(e.target.value);
        }}
      >
        <option value="">Select a pattern…</option>
        {ALL_PATTERNS.map((p) => (
          <option key={p} value={p}>
            {PATTERN_LABELS[p] ?? p}
          </option>
        ))}
        {allowFreeText && <option value="__other__">Other (free text)</option>}
      </select>
      {(!known || value === "") && allowFreeText && (
        <input
          placeholder="Type your pattern name"
          value={known ? "" : value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
