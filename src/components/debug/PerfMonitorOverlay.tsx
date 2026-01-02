import { Perf } from "r3f-perf";
import { useEffect, useRef, useState } from "react";

/**
 * A performance monitor overlay.
 * Renders `Perf` directly inside the Canvas so internal hooks (useThree/useStore)
 * run within the R3F context. We avoid wrapping it in `<Html/>` which portals
 * the React subtree out of the Canvas and breaks hook usage.
 */
export function PerfMonitorOverlay() {
  const [visible] = useState(true);
  const posRef = useRef({ x: 20, y: 20 });

  useEffect(() => {
    if (!visible) return;

    let attached = true;
    let el: HTMLElement | null = null;
    const dragState = { dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 };

    const tryAttach = () => {
      if (!attached) return;
      // Perf renders a portal div; we give it a specific class to find it reliably
      el = document.querySelector('.perf-monitor') as HTMLElement | null;
      if (!el) {
        // Retry briefly until it mounts
        setTimeout(tryAttach, 150);
        return;
      }

      // Ensure the element is positioned and interactive
      el.style.position = 'fixed';
      el.style.left = `${posRef.current.x}px`;
      el.style.top = `${posRef.current.y}px`;
      el.style.zIndex = '9999';
      el.style.cursor = 'move';
      el.style.pointerEvents = 'auto';

      const onPointerDown = (ev: PointerEvent) => {
        // Ignore non-left clicks or interactions with inputs/controls
        if ((ev as PointerEvent).button !== 0) return;
        const target = ev.target as HTMLElement | null;
        if (target && target.closest && target.closest('input,button,select,textarea,a')) return;

        dragState.dragging = true;
        dragState.startX = ev.clientX;
        dragState.startY = ev.clientY;
        dragState.origX = posRef.current.x;
        dragState.origY = posRef.current.y;
        try {
          (ev.target as Element).setPointerCapture(ev.pointerId);
        } catch {
          // ignore
        }
        ev.preventDefault();
      };

      const onPointerMove = (ev: PointerEvent) => {
        if (!dragState.dragging || !el) return;
        const dx = ev.clientX - dragState.startX;
        const dy = ev.clientY - dragState.startY;
        const nextX = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, dragState.origX + dx));
        const nextY = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, dragState.origY + dy));
        posRef.current.x = nextX;
        posRef.current.y = nextY;
        el.style.left = `${nextX}px`;
        el.style.top = `${nextY}px`;
      };

      const onPointerUp = (ev: PointerEvent) => {
        dragState.dragging = false;
        try {
          (ev.target as Element).releasePointerCapture(ev.pointerId);
        } catch {
          // ignore
        }
      };

      el.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      // cleanup
      const detach = () => {
        el?.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      // Save detach on the element so we can call it in cleanup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el as any).__perfDetach = detach;
    };

    tryAttach();

    return () => {
      attached = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const elNow = document.querySelector('.perf-monitor') as any;
      if (elNow && elNow.__perfDetach) elNow.__perfDetach();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <Perf
        className="perf-monitor"
        position="top-left"
        minimal={false}
        style={{
          // Keep the visual styling similar to the previous overlay
          minWidth: 160,
          pointerEvents: 'auto',
        }}
      />
    </>
  );
}