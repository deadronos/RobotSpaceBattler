import { Perf } from "r3f-perf";
import { useState } from "react";

/**
 * A draggable performance monitor overlay.
 * Uses r3f-perf for metrics.
 *
 * Note: r3f-perf usually portals its UI to the canvas container.
 * To make it truly "draggable" while keeping its internal optimizations,
 * we would need to reimplement the UI using usePerf() data or hack the DOM.
 *
 * For now, we provide the robust default Perf overlay.
 * If you need strict draggable behavior, we can wrap a custom UI around usePerf().
 */
export function PerfMonitorOverlay() {
  const [visible, setVisible] = useState(true);

  // Toggle with 'p' key
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.key === 'p') setVisible(v => !v)
  //   }
  //   window.addEventListener('keydown', handleKeyDown)
  //   return () => window.removeEventListener('keydown', handleKeyDown)
  // }, [])

  if (!visible) return null;

  // We use the standard optimized overlay for now.
  // "minimal" reduces clutter.
  // "position" sets the default anchor.
  return <Perf position="top-left" minimal={false} />;
}
