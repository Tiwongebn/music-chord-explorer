import { useEffect, useRef, type RefObject } from "react";

// One behaviour for every panel that opens on request (chord
// editor, "Why this chord?", substitution ideas, metronome):
//
//  - Opening scrolls the panel into view and moves focus to its
//    heading (or the panel itself), so keyboard and screen
//    reader users land in it.
//  - Escape inside the panel closes it.
//  - Closing returns focus to whatever opened it, so nobody is
//    dropped at the top of the page.
//
// `openKey` is null while closed and changes every time the
// panel opens (on a new chord, say), which re-runs the focus.
export function usePanel(
  ref: RefObject<HTMLElement | null>,
  openKey: unknown,
  onClose: () => void,
  { scroll = true, focus = true }: { scroll?: boolean; focus?: boolean } = {}
) {
  const returnTo = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const isOpen = openKey !== null && openKey !== undefined;

  // Open: remember the trigger, bring the panel in, focus it.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const active = document.activeElement;
    if (
      !returnTo.current &&
      active instanceof HTMLElement &&
      active !== document.body &&
      !ref.current?.contains(active)
    ) {
      returnTo.current = active;
    }

    const panel = ref.current;
    if (!panel) {
      return;
    }

    if (scroll) {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      panel.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "nearest",
      });
    }

    if (focus) {
      const target =
        panel.querySelector<HTMLElement>("h2, h3, h4, h5, h6") ?? panel;
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
    }
  }, [openKey, isOpen, ref, scroll, focus]);

  // Close: hand focus back to the trigger if focus went with
  // the panel (it's now on <body>) or is still inside it.
  useEffect(() => {
    if (isOpen) {
      return;
    }

    const target = returnTo.current;
    returnTo.current = null;
    const active = document.activeElement;
    if (
      target?.isConnected &&
      (!active || active === document.body || ref.current?.contains(active))
    ) {
      target.focus({ preventScroll: true });
    }
  }, [isOpen, ref]);

  // Escape anywhere inside the panel closes it.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const panel = ref.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    panel?.addEventListener("keydown", handleKeyDown);
    return () => panel?.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, ref]);
}
