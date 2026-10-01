import * as React from 'react';

/**
 * Whether the thing on screen is worth running a clock for: the tab is visible and the node is in view.
 * Returns a ref callback to put on the node and the answer. Anything that ticks on a timer while nobody can
 * see it should gate on this, so a page at rest costs nothing.
 */
export function useAwake(): [(el: Element | null) => void, boolean] {
  const [el, setEl] = React.useState<Element | null>(null);
  const [seen, setSeen] = React.useState(true);
  const [shown, setShown] = React.useState(() => typeof document === 'undefined' || !document.hidden);
  React.useEffect(() => {
    if (!el) return;
    const watch = new IntersectionObserver((entries) => setSeen(entries[entries.length - 1]?.isIntersecting ?? true)); // the latest entry is the current truth
    const visibility = () => setShown(!document.hidden);
    watch.observe(el);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => { watch.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [el]);
  return [setEl, seen && shown];
}
