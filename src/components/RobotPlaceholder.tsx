import React from 'react'

type Props = {
  position?: [number, number, number]
  team?: 'red' | 'blue'
}

export default function RobotPlaceholder({
  position = [0, 1, 0],
  team = 'red',
}: Props): JSX.Element {
  const color = team === 'red' ? 'crimson' : 'dodgerblue'
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.8, 1.8, 0.6]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
