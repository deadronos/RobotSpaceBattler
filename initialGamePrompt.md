i want to have a 3d team vs team (red vs blue) autobattler gamesimulation with humanoid robots and lasers/guns/rockets

it should initially be setup for 10 vs 10 ai controlled robots in a space-station like environment with proper shadows and lighting 


using 
typescript
react-three-fiber
rapier3d for physics
@react-three/drei  helpers
zustand 
miniplex  for ecs entities
@react-three/postprocessing  optional effects not handled otherwise
@react-three/gltfjsx  (we can create proper meshes with blender later)  > start with procedurally generated meshes for robots/equipped 

vite (+recommended plugins?)
vitest (+recommended plugins?)
eslint (+recommended plugins)
prettier
playwright should be used to verify basic functionality of the webpage

make sure to pull in latest packages

come up with a spec / concept for this and advise on pitfalls/recommend what 