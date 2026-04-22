import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html, Instance, Instances, SoftShadows, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Store, TownConfig, LevelVisibility } from '../types';
import { CPT_CONFIG, LAYERS } from '../constants';

// --- Helper Components ---

// Renders the Ground and Grid - Minimalist Architectural Style
const TownEnvironment = ({ town }: { town: TownConfig }) => {
  const gridColor = "#cbd5e1"; // Slate-300
  const groundColor = "#ffffff"; // White
  
  // Create labels for the grid
  const labels = useMemo(() => {
    const items = [];
    const step = town.size / town.divisions;
    const halfSize = town.size / 2;
    const offset = 25; // increased offset for visibility

    for (let i = 0; i < town.divisions; i++) {
        const center = (i * step) + (step / 2) - halfSize;
        
        // X-axis labels (along Z edge) - RED
        items.push({
            pos: [center, 2, halfSize + offset] as [number, number, number],
            text: i.toString(),
            color: "#ef4444", // Red-500
            key: `x-${i}`
        });
        // Z-axis labels (along X edge) - BLUE
        items.push({
            pos: [halfSize + offset, 2, center] as [number, number, number],
            text: i.toString(),
            color: "#3b82f6", // Blue-500
            key: `z-${i}`
        });
    }
    return items;
  }, [town]);

  return (
    <group>
      {/* Infinite Ground Plane Visual */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial color={groundColor} />
      </mesh>

      {/* The Town Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
         <planeGeometry args={[town.size, town.size]} />
         <meshStandardMaterial color="#f8fafc" polygonOffset polygonOffsetFactor={1} />
      </mesh>

      {/* Grid Helper */}
      <gridHelper 
        args={[town.size, town.divisions, "#94a3b8", "#e2e8f0"]} 
        position={[0, 0.1, 0]} 
      />

      {/* Labels */}
      {labels.map(l => (
          <Text
            key={l.key}
            position={l.pos}
            fontSize={town.size / 30}
            color={l.color}
            fontWeight={700}
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
            anchorX="center"
            anchorY="middle"
            rotation={[-Math.PI/2, 0, 0]}
          >
              {l.text}
          </Text>
      ))}

        {/* Origin Label */}
        <Text
             position={[-town.size/2 - 20, 5, -town.size/2 - 20]}
             fontSize={town.size / 25}
             color="#94a3b8"
             anchorX="right"
             anchorY="bottom"
             rotation={[-Math.PI/2, 0, 0]}
        >
            Origin
        </Text>
    </group>
  );
};

// Decorative Buildings - Cityscape Aesthetic (Blues/Greys)
const DecorativeBuildings = ({ town }: { town: TownConfig }) => {
    const instances = useMemo(() => {
        const temp = [];
        
        let count = 30;
        let heightRange = { min: 5, max: 20 };
        let widthRange = { min: 5, max: 15 };

        if (town.id === 'A') { 
            // Metropolis: Denser and Taller
            count = 200; 
            heightRange = { min: 20, max: 120 };
            widthRange = { min: 8, max: 25 };
        } else if (town.id === 'B') { 
            // Urban: Medium
            count = 80; 
            heightRange = { min: 10, max: 60 };
            widthRange = { min: 5, max: 20 };
        } else { 
            // Rural: Sparse and Low
            count = 30; 
            heightRange = { min: 3, max: 15 };
            widthRange = { min: 5, max: 12 };
        }
        
        // Architectural Palette
        const colors = [
            '#cbd5e1', // Slate 300
            '#94a3b8', // Slate 400
            '#64748b', // Slate 500
            '#475569', // Slate 600
        ];

        const step = town.size / town.divisions;
        
        for (let i = 0; i < count; i++) {
            const width = Math.random() * (widthRange.max - widthRange.min) + widthRange.min;
            const depth = Math.random() * (widthRange.max - widthRange.min) + widthRange.min;
            const height = Math.random() * (heightRange.max - heightRange.min) + heightRange.min;
            
            let x, z;
             do {
                x = (Math.random() - 0.5) * (town.size - width);
                z = (Math.random() - 0.5) * (town.size - depth);
            } while (Math.abs(x) < 50 && Math.abs(z) < 50); // Avoid center origin

            const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);

            temp.push({
                position: [x, height/2, z] as [number, number, number],
                scale: [width, height, depth] as [number, number, number],
                color: color
            })
        }
        return temp;
    }, [town]);

    return (
        <Instances range={instances.length} castShadow receiveShadow>
            <boxGeometry />
            <meshStandardMaterial roughness={0.1} metalness={0.1} />
            {instances.map((data, i) => (
                <Instance
                    key={i}
                    position={data.position}
                    scale={data.scale}
                    color={data.color}
                />
            ))}
        </Instances>
    )
}


// Individual Store Component - Highlighted Data Points
interface StoreMarkerProps {
    store: Store;
    visible: boolean;
    hovered: number | null;
    setHovered: (id: number | null) => void;
}

const StoreMarker: React.FC<StoreMarkerProps> = ({ 
    store, 
    visible,
    hovered,
    setHovered 
}) => {
    const config = CPT_CONFIG[store.type];
    
    // Smooth hover effect ref
    const meshRef = useRef<THREE.Mesh>(null);
    const isHovered = hovered === store.id;

    useFrame((state) => {
        if (meshRef.current) {
            // Gentle bobbing for active elements
            const t = state.clock.getElapsedTime();
            const hoverLift = isHovered ? 15 : 0;
            const bob = Math.sin(t * 2) * 2;
            
            const targetY = LAYERS.STORE + config.baseHeight / 2 + hoverLift + bob;
            meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
            
            // Rotation removed as requested
            // meshRef.current.rotation.y += 0.01; 
        }
    });

    if (!visible) return null;

    // Display Name: Custom or Default
    const displayName = store.customName || config.name;

    return (
        <group position={[store.position[0], 0, store.position[2]]}>
            
            {/* 1. Market Range (Effective Range) - BOTTOM LAYER */}
            {/* Visual: Colored Area + Black Border */}
            
            {/* Range Fill */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LAYERS.RANGE, 0]}>
                <circleGeometry args={[store.effectiveRange, 64]} />
                <meshBasicMaterial 
                    color={config.color} 
                    transparent 
                    opacity={0.3} // Visible colored tint
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
            
            {/* Range Border (Black) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LAYERS.RANGE_BORDER, 0]}>
                <ringGeometry args={[store.effectiveRange - 1.5, store.effectiveRange, 64]} />
                <meshBasicMaterial color="#000000" side={THREE.DoubleSide} transparent opacity={0.6} />
            </mesh>

            {/* 2. Threshold (Survival Requirement) - TOP LAYER */}
            {/* Visual: White Area + Colored Border */}
            
            {/* Threshold Fill (White) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LAYERS.THRESHOLD, 0]}>
                <circleGeometry args={[config.threshold * 2, 48]} />
                <meshBasicMaterial 
                    color="#ffffff" 
                    transparent 
                    opacity={0.85} // High opacity to stand out on top of the range
                    side={THREE.DoubleSide} 
                    depthWrite={false}
                />
            </mesh>

            {/* Threshold Border (Colored) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LAYERS.THRESHOLD_BORDER, 0]}>
                <ringGeometry args={[config.threshold * 2 - 2, config.threshold * 2, 48]} />
                <meshBasicMaterial color={config.color} side={THREE.DoubleSide} />
            </mesh>


            {/* 3. The Store "Pin" / Building */}
            <mesh 
                ref={meshRef}
                position={[0, LAYERS.STORE + config.baseHeight / 2, 0]} 
                castShadow 
                receiveShadow
                onPointerOver={(e) => { e.stopPropagation(); setHovered(store.id); }}
                onPointerOut={(e) => { setHovered(null); }}
            >
                <boxGeometry args={[config.baseHeight / 2, config.baseHeight, config.baseHeight / 2]} />
                <meshStandardMaterial 
                    color={config.color} 
                    emissive={config.color}
                    emissiveIntensity={0.2}
                    roughness={0.2}
                    metalness={0.5}
                />
            </mesh>

            {/* Connector Line to Ground */}
            <mesh position={[0, config.baseHeight/2, 0]}>
                 <cylinderGeometry args={[1, 1, config.baseHeight, 8]} />
                 <meshBasicMaterial color={config.color} opacity={0.5} transparent />
            </mesh>

            {/* Tooltip HTML Overlay */}
            {isHovered && (
                <Html 
                    position={[0, config.baseHeight + 40, 0]} 
                    center 
                    zIndexRange={[100, 0]}
                    style={{ pointerEvents: 'none' }} // FIX: Prevent tooltip from blocking mouse events causing flicker
                >
                    <div className="bg-slate-900/90 text-white p-4 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700 min-w-[220px] transform transition-all scale-100 origin-bottom pointer-events-none">
                        <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-2">
                             <div className="w-3 h-3 rounded-full" style={{backgroundColor: config.color}}></div>
                            <span className="font-bold text-sm">{displayName}</span>
                        </div>
                        <div className="space-y-2 text-xs text-slate-300">
                            <div className="flex justify-between">
                                <span>座標 Grid</span>
                                <span className="font-mono text-white bg-slate-800 px-1 rounded">
                                    <span className="text-red-400">{store.xGrid}</span>, <span className="text-blue-400">{store.zGrid}</span>
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>商閾</span>
                                <span className="text-white font-semibold">{config.threshold}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>商品圈</span>
                                <span>{config.range}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>實際商品圈</span>
                                <span className="text-emerald-400 font-bold">{store.effectiveRange.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
};

// --- Main Scene Component ---

interface SceneProps {
    town: TownConfig;
    stores: Store[];
    visibility: LevelVisibility;
}

const Scene3D: React.FC<SceneProps> = ({ town, stores, visibility }) => {
    const [hoveredStoreId, setHoveredStoreId] = useState<number | null>(null);

    // Initial Camera Position
    const camPos = useMemo(() => {
        const dist = town.size * 1.1; // Slightly zoomed out
        return [dist, dist * 0.8, dist] as [number, number, number]; 
    }, [town]);

    return (
        <Canvas shadows dpr={[1, 2]} camera={{ position: camPos, fov: 35, near: 1, far: 5000 }}>
             
             {/* Architectural Lighting Setup */}
             <color attach="background" args={['#f8fafc']} />
             
             <ambientLight intensity={0.7} color="#ffffff" />
             
             {/* Main Sun - High Resolution Shadows */}
             <directionalLight 
                position={[town.size, town.size * 1.5, town.size/2]} 
                intensity={1.2} 
                castShadow 
                shadow-bias={-0.0005}
                shadow-mapSize={[2048, 2048]}
             >
                <orthographicCamera attach="shadow-camera" args={[-town.size, town.size, town.size, -town.size, 1, 3000]} />
             </directionalLight>

             {/* Fill Light (Blue-ish for shadows) */}
             <directionalLight position={[-town.size, town.size, -town.size]} intensity={0.3} color="#bfdbfe" />

             {/* Fog removed as requested */}
             
            {/* Environment */}
            <TownEnvironment town={town} />
            <DecorativeBuildings town={town} />

            {/* Stores */}
            {stores.map(store => (
                <StoreMarker 
                    key={store.id} 
                    store={store} 
                    visible={visibility[store.type]}
                    hovered={hoveredStoreId}
                    setHovered={setHoveredStoreId}
                />
            ))}

            {/* Controls */}
            <OrbitControls 
                makeDefault 
                minDistance={100} 
                maxDistance={town.size * 2.5} 
                maxPolarAngle={Math.PI / 2.1}
                dampingFactor={0.05}
                autoRotate={false}
                autoRotateSpeed={0.5}
            />
        </Canvas>
    );
};

export default Scene3D;