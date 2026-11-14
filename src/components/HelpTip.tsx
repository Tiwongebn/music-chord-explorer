import { useId, useState, type ReactNode } from "react";

interface HelpTipProps {
  // The setting this explains, e.g. "Tempo". Used for the
  // button's accessible name ("About Tempo").
  label: string;
  children: ReactNode;
}

// A small "ⓘ" toggletip. Unlike a `title` tooltip it works
// with the keyboard, on touch screens and with screen readers:
// the button toggles the explanation, which appears in the
// flow right under the label.
function HelpTip({ label, children }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <>
      <button
        type="button"
        className="help-icon"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            setOpen(false);
          }
        }}
      >
        <span aria-hidden="true">ⓘ</span>
      </button>

      <p id={id} className="help-tip-text" hidden={!open}>
        {children}
      </p>
    </>
  );
}

export default HelpTip;
