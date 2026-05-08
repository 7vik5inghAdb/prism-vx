"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface AutoTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
  minRows?: number;
  maxRows?: number;
}

/**
 * Textarea that auto-grows with its content. No internal scrollbar — the
 * field expands instead. Honours minRows / maxRows to avoid 1-line collapses
 * or runaway tall fields.
 */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  function AutoTextarea({ value, onChange, minRows = 2, maxRows = 40, style, ...rest }, fwdRef) {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(fwdRef, () => innerRef.current as HTMLTextAreaElement);

    function resize() {
      const el = innerRef.current;
      if (!el) return;
      // Reset to compute scrollHeight accurately
      el.style.height = "auto";
      const cs = window.getComputedStyle(el);
      const lineHeight = parseFloat(cs.lineHeight || "0") || 18;
      const padding =
        parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
      const border =
        parseFloat(cs.borderTopWidth || "0") +
        parseFloat(cs.borderBottomWidth || "0");
      const minHeight = lineHeight * minRows + padding + border;
      const maxHeight = lineHeight * maxRows + padding + border;
      const next = Math.min(
        Math.max(el.scrollHeight + border, minHeight),
        maxHeight
      );
      el.style.height = `${next}px`;
      // Show scroll only if we hit the cap
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }

    useEffect(() => {
      resize();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    useEffect(() => {
      // Resize on mount and on viewport changes
      resize();
      const handler = () => resize();
      window.addEventListener("resize", handler);
      return () => window.removeEventListener("resize", handler);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <textarea
        ref={innerRef}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          resize();
        }}
        style={{ resize: "none", overflow: "hidden", ...style }}
        {...rest}
      />
    );
  }
);
