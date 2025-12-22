import { useEffect } from 'react';
import { Color } from 'three';

// DEV-only visual overlay that samples the first few instance colors of
// bullets/rockets/lasers/effects and renders swatches + numeric values.
export function InstanceColorDebugger() {
  useEffect(() => {
    const root = document.createElement('div');
    root.id = 'instance-color-debugger';
    Object.assign(root.style, {
      position: 'fixed',
      right: '8px',
      top: '8px',
      zIndex: '99999',
      background: 'rgba(0,0,0,0.6)',
      color: '#fff',
      padding: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      borderRadius: '6px',
      maxWidth: '360px',
      pointerEvents: 'none',
    });
    document.body.appendChild(root);

    const color = new Color();
    let raf = 0;

    function update() {
      const refs = ((window as unknown) as { __instancedRefs?: Record<string, unknown> }).__instancedRefs || {};
      const categories = ['bullets', 'rockets', 'lasers', 'effects'];
      root.innerHTML = '';

      for (const key of categories) {
        const mesh = refs[key];
        const section = document.createElement('div');
        Object.assign(section.style, { marginBottom: '6px' });
        const title = document.createElement('div');
        title.textContent = key;
        section.appendChild(title);

        if (!mesh) {
          const msg = document.createElement('div');
          msg.textContent = 'no mesh';
          section.appendChild(msg);
          root.appendChild(section);
          continue;
        }

        // Dev-time cast: the `mesh` object is a Three.js mesh; access
        // instanceColor for debug inspection.
        const instColor = (mesh as unknown as { instanceColor?: { array: Float32Array } }).instanceColor;
        if (!instColor) {
          const msg = document.createElement('div');
          msg.textContent = 'no instanceColor';
          section.appendChild(msg);
          root.appendChild(section);
          continue;
        }

        const arr = instColor.array as Float32Array;
        const total = Math.floor(arr.length / 3);
        const info = document.createElement('div');
        info.textContent = `slots=${total}`;
        section.appendChild(info);

        // Show first non-zero index for quick sense of allocations
        let firstNonZero = -1;
        for (let i = 0; i < arr.length; i += 3) {
          if (arr[i] !== 0 || arr[i + 1] !== 0 || arr[i + 2] !== 0) {
            firstNonZero = i / 3;
            break;
          }
        }
        const f = document.createElement('div');
        f.textContent = `i0=${arr[0].toFixed(2)} i1=${arr[1].toFixed(2)} i2=${arr[2].toFixed(2)} firstNonZero=${firstNonZero}`;
        f.style.fontSize = '11px';
        section.appendChild(f);

        const swatches = document.createElement('div');
        Object.assign(swatches.style, { display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' });
        const max = Math.min(8, total);
        for (let i = 0; i < max; i += 1) {
          const r = arr[i * 3];
          const g = arr[i * 3 + 1];
          const b = arr[i * 3 + 2];
          // Convert linear->sRGB for DOM display
          color.setRGB(r, g, b);
          color.convertLinearToSRGB();
          const style = color.getStyle();

          const sw = document.createElement('div');
          Object.assign(sw.style, {
            width: '28px',
            height: '28px',
            background: style,
            borderRadius: '4px',
            boxShadow: '0 0 6px rgba(0,0,0,0.5) inset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontSize: '10px',
          });

          const label = document.createElement('span');
          label.textContent = String(i);
          sw.appendChild(label);

          const tooltip = document.createElement('div');
          tooltip.textContent = `i=${i} r=${r.toFixed(2)} g=${g.toFixed(2)} b=${b.toFixed(2)}`;
          tooltip.style.fontSize = '10px';

          swatches.appendChild(sw);
          section.appendChild(tooltip);
        }

        section.appendChild(swatches);
        root.appendChild(section);
      }

      // Also show recent instancing telemetry events for allocations/releases
      const stats = ((window as unknown) as { __rendererStats?: Record<string, unknown> }).__rendererStats;
      if (stats && typeof stats === 'object' && Array.isArray((stats as { instancingTelemetry?: unknown }).instancingTelemetry)) {
        const events = ((stats as { instancingTelemetry?: unknown }).instancingTelemetry as unknown[]).slice(-16).reverse();
        const evTitle = document.createElement('div');
        evTitle.textContent = 'instancing telemetry (recent)';
        evTitle.style.marginTop = '6px';
        evTitle.style.fontSize = '12px';
        root.appendChild(evTitle);
        const evList = document.createElement('div');
        evList.style.fontSize = '11px';
        for (const ev of events) {
          // Defensive access with unknown typed event
          const evt = ev as { type?: string; category?: string; entityId?: string; index?: number; timestamp?: number };
          const e = document.createElement('div');
          e.textContent = `${evt.type ?? 'unknown'} ${evt.category ?? ''} id=${evt.entityId ?? '-'} idx=${evt.index ?? '-'} t=${evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : '-'} `;
          evList.appendChild(e);
        }
        root.appendChild(evList);
      }

      raf = requestAnimationFrame(update);
    }

    raf = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(raf);
      root.remove();
    };
  }, []);

  return null;
}
