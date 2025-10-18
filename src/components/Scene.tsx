import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import React, { Suspense, useEffect, useRef, useState } from 'react';

import { useSimulationWorld } from '../ecs/world';
import { useMatchSimulation } from '../hooks/useMatchSimulation';
import { useCameraControls } from '../hooks/useCameraControls';
import { CameraUiIntegrator } from '../systems/CameraUiIntegrator';
import { getRegisteredUiAdapter } from '../systems/uiAdapterRegistry';
import { MatchPlayer } from './match/MatchPlayer';
import { RenderedProjectile, extractProjectileTrails, type ProjectileTrail } from './match/RenderedProjectile';
import { RenderedRobot, getTeamColor } from './match/RenderedRobot';
import Simulation from './Simulation';
import styles from './Scene.module.css';

// ============================================================================
// Match Scene Component
// ============================================================================

interface MatchSceneProps {
  /** Optional match trace for demo/testing. If not provided, uses live simulation */
  matchTrace?: any; // MatchTrace type
  /** Auto-play the match on mount */
  autoPlay?: boolean;
  /** Enable 3D match rendering */
  renderMatch?: boolean;
  /** Visual quality: 'high' | 'medium' | 'low' */
  visualQuality?: 'high' | 'medium' | 'low';
}

/**
 * Inner component that runs the match simulation and renders entities.
 * Separated to use useFrame hook within Canvas context.
 */
const MatchSceneInner: React.FC<MatchSceneProps> = ({
  matchTrace,
  autoPlay = true,
  renderMatch = true,
  visualQuality = 'medium',
}) => {
  const [projectiles, setProjectiles] = useState<ProjectileTrail[]>([]);
  const projectileTimerRef = useRef<number>();

  // Initialize match simulation
  const simulationState = useMatchSimulation({
    trace: matchTrace,
    autoPlay,
    playbackRate: 1.0,
    debugMode: false,
    callbacks: {
      onVictory: (result) => {
        console.log('🎉 Victory!', result);
      },
      onDraw: (result) => {
        console.log('🤝 Draw!', result);
      },
      onTimeout: (result) => {
        console.log('⏱️ Timeout!', result);
      },
    },
  });

  // Update projectile trails from match events
  useEffect(() => {
    if (matchTrace && renderMatch) {
      const trails = extractProjectileTrails(matchTrace.events || []);
      setProjectiles(trails);

      // Clear old projectiles periodically
      clearTimeout(projectileTimerRef.current);
      projectileTimerRef.current = window.setTimeout(() => {
        setProjectiles([]);
      }, 2000); // Keep trails visible for 2 seconds
    }

    return () => {
      clearTimeout(projectileTimerRef.current);
    };
  }, [matchTrace, renderMatch, simulationState.progress]);

  // Render entities each frame
  useFrame(() => {
    // Update projectiles based on current progress
    if (matchTrace && renderMatch) {
      const trails = extractProjectileTrails(matchTrace.events || []);
      // Filter trails that occurred within last 1000ms
      const recentTrails = trails.filter((trail) => simulationState.progress - trail.timestamp < 1000);
      setProjectiles(recentTrails);
    }
  });

  if (!matchTrace) {
    return null; // Fall back to live simulation
  }

  return (
    <>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#081029" />
      </mesh>

      {/* Render 3D robots */}
      {renderMatch &&
        simulationState.entities.map((entity) => (
          <RenderedRobot
            key={entity.id}
            entity={entity}
            teamColor={getTeamColor(entity.teamId)}
            scale={1.0}
            showHealthBar
            quality={visualQuality}
          />
        ))}

      {/* Render projectile trails */}
      {renderMatch &&
        projectiles.map((trail) => (
          <RenderedProjectile
            key={trail.id}
            trail={trail}
            teamColor={getTeamColor(trail.teamId)}
            lifetime={1000}
            trailWidth={0.1}
            showImpact
            quality={visualQuality}
          />
        ))}

      {/* Match HUD overlay */}
      {renderMatch && (
        <Html fullScreen style={{ pointerEvents: 'none' }}>
          <div className={styles.hudContainer}>
            <div className={styles.hudItem}>Time: {(simulationState.progress / 1000).toFixed(1)}s</div>
            <div className={styles.hudItem}>Entities: {simulationState.entities.length}</div>
            <div className={styles.hudItem}>Alive: {simulationState.aliveEntities.length}</div>
            <div className={styles.hudItem}>Status: {simulationState.matchOutcome || 'in-progress'}</div>
            {simulationState.message && (
              <div className={styles.hudMessage}>{simulationState.message}</div>
            )}
          </div>
        </Html>
      )}
    </>
  );
};

// ============================================================================
// Main Scene Component
// ============================================================================

export default function Scene(props: MatchSceneProps = {}) {
  // create camera controls at the Scene level (production mount point)
  const world = useSimulationWorld();
  const controls = useCameraControls({ arena: world.arena });
  const adapter = getRegisteredUiAdapter();

  return (
    <Canvas shadows camera={{ position: [0, 10, 20], fov: 60 }}>
      <ambientLight intensity={0.3} />
      <directionalLight castShadow position={[10, 20, 10]} intensity={1} />

      <Suspense fallback={<Html center>Loading...</Html>}>
        {/* If matchTrace provided, show match scene; otherwise, fall back to live simulation */}
        {props.matchTrace ? <MatchSceneInner {...props} /> : <Simulation />}
      </Suspense>

      <OrbitControls />

      {/* Mount production camera integrator when adapter + controls are available */}
      {adapter && controls ? <CameraUiIntegrator adapter={adapter} controls={controls} /> : null}
    </Canvas>
  );
}
