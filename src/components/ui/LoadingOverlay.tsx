import React from "react";

import { useUI } from "../../store/uiStore";

export default function LoadingOverlay() {
  const loading = useUI((s) => s.loading);
  if (!loading) return null;
  return <div className="ui overlay">Loading…</div>;
}
