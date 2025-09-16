import React from 'react';

import { world } from '../../ecs/miniplexStore';

export default function DevDiagnostics() {
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setCount(world.entities.length);
    }, 100); // Update every 100ms
    
    return () => window.clearInterval(interval);
  }, []);
  
  return (
    <div className="ui dev">
      <span>Entities: {count}</span>
    </div>
  );
}
