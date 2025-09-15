import React from "react";

import useUI from "../../store/uiStore";

export default function LoadingOverlay() {
  const dreiLoading = useUI((s) => s.dreiLoading);
  if (!dreiLoading) return null;
  return (
    <div className="drei-overlay">
      <div className="drei-overlay-card" role="status" aria-live="polite">
        Loading UI…
      </div>
    </div>
  );
}
