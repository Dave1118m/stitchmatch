import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, Layers, Eye, Sparkles, Move3d } from 'lucide-react';

interface ThreeBodyAvatarProps {
  measurements?: {
    chest?: number | string | any;
    waist?: number | string | any;
    hip?: number | string | any;
    inseam?: number | string | any;
    shoulderWidth?: number | string | any;
    armLength?: number | string | any;
    height?: number | string | any;
  };
  isDark?: boolean;
}

export default function ThreeBodyAvatar({ measurements, isDark = true }: ThreeBodyAvatarProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLaserRings, setShowLaserRings] = useState(true);
  const [activeTape, setActiveTape] = useState<'all' | 'chest' | 'waist' | 'hip'>('all');

  // Animation and scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mannequinGroupRef = useRef<THREE.Group | null>(null);
  const laserRingsGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  // Safe numerical parser with fallback defaults
  const parseVal = (val: any, fallback: number): number => {
    if (val === null || val === undefined) return fallback;
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    return isNaN(num) || num <= 0 ? fallback : num;
  };

  // Default fallback anthropometric baselines (cm)
  const chestVal = parseVal(measurements?.chest, 96);
  const waistVal = parseVal(measurements?.waist, 82);
  const hipVal = parseVal(measurements?.hip, 98);
  const shoulderVal = parseVal(measurements?.shoulderWidth, 45);
  const inseamVal = parseVal(measurements?.inseam, 79);
  const armVal = parseVal(measurements?.armLength, 62);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.1, 3.2);
    cameraRef.current = camera;

    // 3. Renderer setup with anti-aliasing
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting (Studio Rim Lights + Ambient)
    const ambientLight = new THREE.AmbientLight(isDark ? 0x334155 : 0xf1f5f9, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x6366f1, 2.2); // Indigo key light
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x06b6d4, 1.8); // Cyan fill light
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 2.5); // Purple rim light
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // 5. Procedural Anatomical Mannequin Construction
    const mannequinGroup = new THREE.Group();
    mannequinGroupRef.current = mannequinGroup;
    scene.add(mannequinGroup);

    // Dynamic scale factors based on actual customer dimensions
    const chestScale = chestVal / 96;
    const waistScale = waistVal / 82;
    const hipScale = hipVal / 98;
    const shoulderScale = shoulderVal / 45;
    const legScale = inseamVal / 79;
    const armScale = armVal / 62;

    // Materials
    const mannequinMaterial = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x1e293b : 0xe2e8f0,
      metalness: 0.1,
      roughness: 0.35,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      transmission: 0.1,
      opacity: 0.95,
      transparent: true,
    });

    const jointMaterial = new THREE.MeshStandardMaterial({
      color: isDark ? 0x4f46e5 : 0x6366f1,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.3,
    });

    // --- Head & Neck ---
    const headGeo = new THREE.SphereGeometry(0.13, 32, 32);
    headGeo.scale(0.85, 1.1, 0.95);
    const head = new THREE.Mesh(headGeo, mannequinMaterial);
    head.position.y = 1.72;
    mannequinGroup.add(head);

    const neckGeo = new THREE.CylinderGeometry(0.05, 0.065, 0.1, 32);
    const neck = new THREE.Mesh(neckGeo, mannequinMaterial);
    neck.position.y = 1.57;
    mannequinGroup.add(neck);

    // --- Upper Torso / Chest ---
    const chestWidth = 0.26 * shoulderScale * chestScale;
    const chestDepth = 0.14 * chestScale;
    const chestGeo = new THREE.CylinderGeometry(chestWidth, chestWidth * 0.85, 0.26, 32);
    chestGeo.scale(1, 1, chestDepth / chestWidth);
    const chestMesh = new THREE.Mesh(chestGeo, mannequinMaterial);
    chestMesh.position.y = 1.38;
    mannequinGroup.add(chestMesh);

    // --- Waist / Midsection ---
    const waistWidth = 0.20 * waistScale;
    const waistDepth = 0.12 * waistScale;
    const waistGeo = new THREE.CylinderGeometry(chestWidth * 0.85, waistWidth, 0.18, 32);
    waistGeo.scale(1, 1, waistDepth / waistWidth);
    const waistMesh = new THREE.Mesh(waistGeo, mannequinMaterial);
    waistMesh.position.y = 1.18;
    mannequinGroup.add(waistMesh);

    // --- Pelvis / Hips ---
    const hipWidth = 0.24 * hipScale;
    const hipDepth = 0.15 * hipScale;
    const pelvisGeo = new THREE.CylinderGeometry(waistWidth, hipWidth, 0.18, 32);
    pelvisGeo.scale(1, 1, hipDepth / hipWidth);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, mannequinMaterial);
    pelvisMesh.position.y = 1.02;
    mannequinGroup.add(pelvisMesh);

    // --- Shoulders Joint Spheres ---
    const shoulderOffset = 0.23 * shoulderScale;
    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), jointMaterial);
    leftShoulder.position.set(-shoulderOffset, 1.46, 0);
    mannequinGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), jointMaterial);
    rightShoulder.position.set(shoulderOffset, 1.46, 0);
    mannequinGroup.add(rightShoulder);

    // --- Arms (Left & Right) in stylish relaxed 'A' pose ---
    const armLength = 0.26 * armScale;
    const forearmLength = 0.24 * armScale;

    // Left Arm
    const leftUpperArmGeo = new THREE.CylinderGeometry(0.038, 0.032, armLength, 16);
    const leftUpperArm = new THREE.Mesh(leftUpperArmGeo, mannequinMaterial);
    leftUpperArm.position.set(-shoulderOffset - 0.06, 1.32, 0);
    leftUpperArm.rotation.z = 0.22;
    mannequinGroup.add(leftUpperArm);

    const leftForearmGeo = new THREE.CylinderGeometry(0.032, 0.025, forearmLength, 16);
    const leftForearm = new THREE.Mesh(leftForearmGeo, mannequinMaterial);
    leftForearm.position.set(-shoulderOffset - 0.11, 1.08, 0.02);
    leftForearm.rotation.z = 0.16;
    mannequinGroup.add(leftForearm);

    // Right Arm
    const rightUpperArmGeo = new THREE.CylinderGeometry(0.038, 0.032, armLength, 16);
    const rightUpperArm = new THREE.Mesh(rightUpperArmGeo, mannequinMaterial);
    rightUpperArm.position.set(shoulderOffset + 0.06, 1.32, 0);
    rightUpperArm.rotation.z = -0.22;
    mannequinGroup.add(rightUpperArm);

    const rightForearmGeo = new THREE.CylinderGeometry(0.032, 0.025, forearmLength, 16);
    const rightForearm = new THREE.Mesh(rightForearmGeo, mannequinMaterial);
    rightForearm.position.set(shoulderOffset + 0.11, 1.08, 0.02);
    rightForearm.rotation.z = -0.16;
    mannequinGroup.add(rightForearm);

    // --- Legs & Inseam (Left & Right) ---
    const thighLength = 0.40 * legScale;
    const calfLength = 0.42 * legScale;
    const legSpacing = 0.10 * hipScale;

    // Left Leg
    const leftThighGeo = new THREE.CylinderGeometry(0.075 * hipScale, 0.052, thighLength, 16);
    const leftThigh = new THREE.Mesh(leftThighGeo, mannequinMaterial);
    leftThigh.position.set(-legSpacing, 0.76 * legScale, 0);
    mannequinGroup.add(leftThigh);

    const leftKnee = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), jointMaterial);
    leftKnee.position.set(-legSpacing, 0.54 * legScale, 0);
    mannequinGroup.add(leftKnee);

    const leftCalfGeo = new THREE.CylinderGeometry(0.050, 0.032, calfLength, 16);
    const leftCalf = new THREE.Mesh(leftCalfGeo, mannequinMaterial);
    leftCalf.position.set(-legSpacing, 0.32 * legScale, 0);
    mannequinGroup.add(leftCalf);

    // Right Leg
    const rightThighGeo = new THREE.CylinderGeometry(0.075 * hipScale, 0.052, thighLength, 16);
    const rightThigh = new THREE.Mesh(rightThighGeo, mannequinMaterial);
    rightThigh.position.set(legSpacing, 0.76 * legScale, 0);
    mannequinGroup.add(rightThigh);

    const rightKnee = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), jointMaterial);
    rightKnee.position.set(legSpacing, 0.54 * legScale, 0);
    mannequinGroup.add(rightKnee);

    const rightCalfGeo = new THREE.CylinderGeometry(0.050, 0.032, calfLength, 16);
    const rightCalf = new THREE.Mesh(rightCalfGeo, mannequinMaterial);
    rightCalf.position.set(legSpacing, 0.32 * legScale, 0);
    mannequinGroup.add(rightCalf);

    // --- Circular Pedestal Platform ---
    const pedestalGeo = new THREE.CylinderGeometry(0.65, 0.72, 0.04, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0f172a : 0xcbd5e1,
      metalness: 0.6,
      roughness: 0.2,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 0.02;
    scene.add(pedestal);

    // 6. Glowing Laser Tape-Measure Rings (Cyan, Emerald, Purple)
    const laserRingsGroup = new THREE.Group();
    laserRingsGroupRef.current = laserRingsGroup;
    scene.add(laserRingsGroup);

    const createGlowingRing = (radiusX: number, radiusZ: number, yPos: number, hexColor: number) => {
      const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusZ, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(64);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometry.rotateX(Math.PI / 2);

      const material = new THREE.LineBasicMaterial({
        color: hexColor,
        linewidth: 3,
      });

      const line = new THREE.Line(geometry, material);
      line.position.y = yPos;

      // Outer glow pulse halo
      const haloGeo = new THREE.TorusGeometry((radiusX + radiusZ) / 2, 0.008, 16, 64);
      haloGeo.rotateX(Math.PI / 2);
      const haloMat = new THREE.MeshBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.6,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.y = yPos;

      const ringContainer = new THREE.Group();
      ringContainer.add(line);
      ringContainer.add(haloMesh);
      return ringContainer;
    };

    // Chest Ring (Cyan Glow #06b6d4 at Y=1.40)
    const chestRing = createGlowingRing(chestWidth * 1.15, chestDepth * 1.25, 1.40, 0x06b6d4);
    chestRing.name = 'chest';
    laserRingsGroup.add(chestRing);

    // Waist Ring (Emerald Glow #10b981 at Y=1.18)
    const waistRing = createGlowingRing(waistWidth * 1.18, waistDepth * 1.30, 1.18, 0x10b981);
    waistRing.name = 'waist';
    laserRingsGroup.add(waistRing);

    // Hip Ring (Purple Glow #a855f7 at Y=1.02)
    const hipRing = createGlowingRing(hipWidth * 1.15, hipDepth * 1.25, 1.02, 0xa855f7);
    hipRing.name = 'hip';
    laserRingsGroup.add(hipRing);

    // 7. Touch & Mouse Drag Controls
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !mannequinGroupRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      mannequinGroupRef.current.rotation.y += deltaX * 0.012;
      if (laserRingsGroupRef.current) {
        laserRingsGroupRef.current.rotation.y += deltaX * 0.012;
      }
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !mannequinGroupRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePositionRef.current.x;
      mannequinGroupRef.current.rotation.y += deltaX * 0.015;
      if (laserRingsGroupRef.current) {
        laserRingsGroupRef.current.rotation.y += deltaX * 0.015;
      }
      previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Auto rotation if not manually dragging
      if (autoRotate && !isDraggingRef.current) {
        if (mannequinGroupRef.current) {
          mannequinGroupRef.current.rotation.y += 0.008;
        }
        if (laserRingsGroupRef.current) {
          laserRingsGroupRef.current.rotation.y += 0.008;
        }
      }

      // Pulse laser tape rings with breathing glow
      if (laserRingsGroupRef.current) {
        const pulse = 1 + Math.sin(elapsedTime * 3) * 0.03;
        laserRingsGroupRef.current.children.forEach((child) => {
          child.scale.set(pulse, 1, pulse);
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth || 360;
      const newHeight = container.clientHeight || 420;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, [chestVal, waistVal, hipVal, shoulderVal, inseamVal, armVal, isDark]);

  // Zoom helpers
  const handleZoom = (delta: number) => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = THREE.MathUtils.clamp(
      cameraRef.current.position.z + delta,
      2.0,
      4.5
    );
  };

  const handleReset = () => {
    if (!cameraRef.current || !mannequinGroupRef.current) return;
    cameraRef.current.position.set(0, 1.1, 3.2);
    mannequinGroupRef.current.rotation.y = 0;
    if (laserRingsGroupRef.current) {
      laserRingsGroupRef.current.rotation.y = 0;
    }
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border shadow-xl flex flex-col ${
      isDark ? 'bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 border-gray-800' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100 border-slate-200'
    }`}>
      {/* Top Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1.5 rounded-full backdrop-blur-md bg-black/60 border border-white/20 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg">
            <Move3d className="w-3.5 h-3.5 text-primary-400" />
            <span>3D Body Avatar</span>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary-950/80 text-primary-300 border border-primary-800/60">
            Real-time Mesh Deformation
          </span>
        </div>

        <div className="flex items-center space-x-1.5 pointer-events-auto">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2 rounded-xl backdrop-blur-md border text-xs font-medium transition-all ${
              autoRotate 
                ? 'bg-primary-600 border-primary-400 text-white shadow-md' 
                : isDark ? 'bg-gray-800/80 border-gray-700 text-gray-300' : 'bg-white/80 border-gray-200 text-gray-700'
            }`}
            title={autoRotate ? 'Pause Rotation' : 'Auto Rotate'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>
          <button
            onClick={() => handleZoom(-0.3)}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
              isDark ? 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(0.3)}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
              isDark ? 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-xs font-semibold transition-all ${
              isDark ? 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Reset
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div 
        ref={mountRef} 
        className="w-full h-[360px] sm:h-[420px] cursor-grab active:cursor-grabbing flex items-center justify-center relative"
      />

      {/* Floating Measurement Tags Legend */}
      <div className={`px-4 py-3 border-t grid grid-cols-3 gap-2 text-center text-xs font-semibold backdrop-blur-md ${
        isDark ? 'border-gray-800/80 bg-gray-950/80' : 'border-gray-100 bg-white/80'
      }`}>
        <div className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Chest Ring</span>
          <span className="text-sm font-extrabold text-cyan-300">{chestVal.toFixed(1)} cm</span>
        </div>
        <div className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Waist Ring</span>
          <span className="text-sm font-extrabold text-emerald-300">{waistVal.toFixed(1)} cm</span>
        </div>
        <div className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-purple-500/30 bg-purple-950/20 text-purple-400">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Hip Ring</span>
          <span className="text-sm font-extrabold text-purple-300">{hipVal.toFixed(1)} cm</span>
        </div>
      </div>
    </div>
  );
}
