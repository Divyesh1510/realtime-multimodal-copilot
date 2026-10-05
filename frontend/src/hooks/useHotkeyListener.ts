"use client";

import { useEffect, useRef } from "react";

interface HotkeyListenerProps {
  onTrigger: (customPrompt?: string) => void;
  enabled?: boolean;
}

/**
 * Global hotkey listener for Push-to-Query manual override.
 * Default: Ctrl + Space (Windows/Linux) or Cmd + Shift + Space (macOS).
 */
export function useHotkeyListener({ onTrigger, enabled = true }: HotkeyListenerProps) {
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Windows/Linux: Ctrl + Space
      const isCtrlSpace = (e.ctrlKey || e.metaKey) && e.code === "Space";

      if (isCtrlSpace) {
        e.preventDefault();
        console.log("[Hotkey] Manual Push-to-Query triggered!");
        onTriggerRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
