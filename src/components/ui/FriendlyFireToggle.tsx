import React from 'react';

import { useUI } from '../../store/uiStore';

export default function FriendlyFireToggle() {
  const friendlyFire = useUI((s) => s.friendlyFire);
  const setFriendlyFire = useUI((s) => s.setFriendlyFire);

  return (
    <div className="ui control">
      <label>
        <input
          type="checkbox"
          checked={friendlyFire}
          onChange={(e) => setFriendlyFire(e.target.checked)}
        />
        Friendly fire
      </label>
    </div>
  );
}
