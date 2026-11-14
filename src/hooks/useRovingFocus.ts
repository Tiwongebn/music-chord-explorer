import { useCallback, useRef, useState, type KeyboardEvent } from "react";

// Roving tabindex for a row of keys (piano keys, guitar
// strings, fretboard dots): the whole instrument is one Tab
// stop, and the arrow keys move between its keys. Home and End
// jump to the ends. This is the WAI-ARIA "composite widget"
// pattern, and it keeps Tab for moving between controls.
//
//   const roving = useRovingFocus(ids, "C4");
//   <div role="group" onKeyDown={roving.onKeyDown}>
//     {ids.map((id) => <button {...roving.itemProps(id)} />)}
//   </div>
export function useRovingFocus(ids: string[], initial?: string) {
  const [active, setActive] = useState<string | undefined>(initial);
  const nodes = useRef(new Map<string, HTMLElement | SVGElement>());

  // The active id may vanish (a different chord, another
  // shape); fall back to the first item so Tab still lands.
  const current =
    active !== undefined && ids.includes(active) ? active : ids[0];

  const focusId = useCallback((id: string) => {
    setActive(id);
    nodes.current.get(id)?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const index = ids.indexOf(current);
    let next: number;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(ids.length - 1, index + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.max(0, index - 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = ids.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    if (ids[next] !== undefined) {
      focusId(ids[next]);
    }
  };

  const itemProps = (id: string) => ({
    tabIndex: id === current ? 0 : -1,
    onFocus: () => setActive(id),
    ref: (node: HTMLElement | SVGElement | null) => {
      if (node) {
        nodes.current.set(id, node);
      } else {
        nodes.current.delete(id);
      }
    },
  });

  return { onKeyDown, itemProps };
}
