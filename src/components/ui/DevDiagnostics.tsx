import React from 'react';

import { world } from '../../ecs/miniplexStore';

export default function DevDiagnostics() {
  const count = world.entities.length;
  return (
    <div className="ui dev">
      <span>Entities: {count}</span>
    </div>
  );
}
