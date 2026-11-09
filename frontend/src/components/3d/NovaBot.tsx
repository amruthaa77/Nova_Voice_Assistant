import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssistantStatus } from '../../api/types';

export interface NovaBotProps {
  status: AssistantStatus;
  reducedMotion?: boolean;
  isHovered?: boolean;
  isPressed?: boolean;
  onToggleSession?: () => void;
}

export type RobotMascotProps = NovaBotProps;

export const NovaBot: React.FC<NovaBotProps> = ({
  status,
  reducedMotion = false,
  isHovered = false,
  isPressed = false,
  onToggleSession,
}) => {
  const robotGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftEarLightRef = useRef<THREE.PointLight>(null);
  const rightEarLightRef = useRef<THREE.PointLight>(null);
  const hoverRingRef = useRef<THREE.Mesh>(null);
  const shadowMeshRef = useRef<THREE.Mesh>(null);

  // Materials & Colors
  const neonColor = useMemo(
    () => new THREE.Color(status === 'error' ? '#FF5C5C' : '#D4F23A'),
    [status]
  );
  const lavenderTorsoColor = useMemo(() => new THREE.Color('#8279D2'), []);
  const whiteShellColor = useMemo(() => new THREE.Color('#F7F7FD'), []);

  // Soft Radial Ellipse Shadow Texture
  const shadowTexture = useMemo(() => {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 256;
    const ctx = cvs.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
      grad.addColorStop(0, 'rgba(20, 15, 45, 0.28)');
      grad.addColorStop(0.5, 'rgba(35, 25, 75, 0.12)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    const tex = new THREE.CanvasTexture(cvs);
    return tex;
  }, []);

  // Pixel Face Canvas Texture
  const { faceTexture, canvas, ctx } = useMemo(() => {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 160;
    const context = cvs.getContext('2d');
    const texture = new THREE.CanvasTexture(cvs);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    return { faceTexture: texture, canvas: cvs, ctx: context };
  }, []);

  // Pixel Face Rendering
  const drawPixelFace = (time: number) => {
    if (!ctx) return;

    // Clear Screen Visor
    ctx.fillStyle = '#0B0B12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFE500';
    ctx.imageSmoothingEnabled = false;

    const eyeSize = 16;
    const leftEyeX = 72;
    const rightEyeX = 168;
    const eyeY = 56;

    // Eye blinking logic (blink for ~150ms every 4s in idle)
    const blinkCycle = time % 4.0;
    const isBlinking = status === 'idle' && blinkCycle > 3.82;

    switch (status) {
      case 'connecting': {
        // 3 cycling loading pixel dots
        const activeDot = Math.floor((time * 3.5) % 3);
        const dotSize = 14;
        const startX = 82;
        const dotY = 72;
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i === activeDot ? '#FFE500' : '#4D4200';
          ctx.fillRect(startX + i * 38, dotY, dotSize, dotSize);
        }
        break;
      }

      case 'thinking': {
        // Rotating pixel spinner
        const angle = time * 5.5;
        const radius = 24;
        const centerX = 128;
        const centerY = 74;
        for (let i = 0; i < 4; i++) {
          const a = angle + (i * Math.PI) / 2;
          const x = centerX + Math.cos(a) * radius - 6;
          const y = centerY + Math.sin(a) * radius - 6;
          ctx.fillStyle = i === 0 ? '#FFE500' : '#6A5F00';
          ctx.fillRect(x, y, 12, 12);
        }
        break;
      }

      case 'listening': {
        // Wide alert attentive square eyes
        ctx.fillStyle = '#FFE500';
        ctx.fillRect(leftEyeX - 3, eyeY - 4, eyeSize + 6, eyeSize + 8);
        ctx.fillRect(rightEyeX - 3, eyeY - 4, eyeSize + 6, eyeSize + 8);
        // Center pupil reflection
        ctx.fillStyle = '#0B0B12';
        ctx.fillRect(leftEyeX + 3, eyeY + 1, 6, 6);
        ctx.fillRect(rightEyeX + 3, eyeY + 1, 6, 6);

        // Attentive smile
        ctx.fillStyle = '#FFE500';
        ctx.fillRect(104, 110, 48, 6);
        ctx.fillRect(98, 104, 6, 6);
        ctx.fillRect(152, 104, 6, 6);
        break;
      }

      case 'speaking': {
        // Expressive eyes
        ctx.fillStyle = '#FFE500';
        ctx.fillRect(leftEyeX, eyeY, eyeSize, eyeSize);
        ctx.fillRect(rightEyeX, eyeY, eyeSize, eyeSize);

        // Dynamic talking mouth
        const mouthOpen = Math.abs(Math.sin(time * 11)) > 0.42;
        if (mouthOpen) {
          ctx.fillRect(108, 98, 40, 20);
          ctx.fillStyle = '#0B0B12';
          ctx.fillRect(114, 104, 28, 8);
        } else {
          ctx.fillRect(106, 108, 44, 6);
          ctx.fillRect(100, 102, 6, 6);
          ctx.fillRect(150, 102, 6, 6);
        }
        break;
      }

      case 'error': {
        // Cross 'X X' eyes
        ctx.fillStyle = '#FF5C5C';
        // Left X
        ctx.fillRect(leftEyeX, eyeY, 5, 5);
        ctx.fillRect(leftEyeX + 11, eyeY, 5, 5);
        ctx.fillRect(leftEyeX + 5, eyeY + 5, 6, 6);
        ctx.fillRect(leftEyeX, eyeY + 11, 5, 5);
        ctx.fillRect(leftEyeX + 11, eyeY + 11, 5, 5);

        // Right X
        ctx.fillRect(rightEyeX, eyeY, 5, 5);
        ctx.fillRect(rightEyeX + 11, eyeY, 5, 5);
        ctx.fillRect(rightEyeX + 5, eyeY + 5, 6, 6);
        ctx.fillRect(rightEyeX, eyeY + 11, 5, 5);
        ctx.fillRect(rightEyeX + 11, eyeY + 11, 5, 5);

        // Flat mouth
        ctx.fillRect(110, 108, 36, 6);
        break;
      }

      case 'idle':
      default: {
        ctx.fillStyle = '#FFE500';
        if (isBlinking) {
          // Blink: flat pixel bar
          ctx.fillRect(leftEyeX - 2, eyeY + 6, eyeSize + 4, 4);
          ctx.fillRect(rightEyeX - 2, eyeY + 6, eyeSize + 4, 4);
        } else {
          // Two pixel eyes
          ctx.fillRect(leftEyeX, eyeY, eyeSize, eyeSize);
          ctx.fillRect(rightEyeX, eyeY, eyeSize, eyeSize);
        }

        // Stepped pixel smile
        ctx.fillRect(108, 108, 40, 6);
        ctx.fillRect(102, 102, 6, 6);
        ctx.fillRect(148, 102, 6, 6);
        break;
      }
    }

    faceTexture.needsUpdate = true;
  };

  // Animation frame loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Redraw face canvas
    drawPixelFace(t);

    if (reducedMotion || !robotGroupRef.current) return;

    // 1. Ambient Floating Bobbing
    const bobOffset = Math.sin(t * 2.2) * 0.08;
    robotGroupRef.current.position.y = bobOffset;

    // 2. Interactive Scale (Hover 1.03, Press 0.97)
    const targetScale = isPressed ? 0.97 : isHovered ? 1.03 : 1.0;
    robotGroupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.15
    );

    // 3. Hover lavender glow ring opacity
    if (hoverRingRef.current) {
      const targetOpacity = isHovered ? 0.35 : 0.0;
      (hoverRingRef.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
        (hoverRingRef.current.material as THREE.MeshBasicMaterial).opacity,
        targetOpacity,
        0.12
      );
    }

    // 4. Head movement per state
    if (headGroupRef.current) {
      if (status === 'thinking') {
        headGroupRef.current.rotation.z = Math.sin(t * 2.5) * 0.16;
        headGroupRef.current.rotation.y = Math.cos(t * 1.8) * 0.1;
      } else if (status === 'listening') {
        headGroupRef.current.rotation.x = 0.12 + Math.sin(t * 3.5) * 0.02;
        headGroupRef.current.rotation.z = Math.sin(t * 1.5) * 0.02;
      } else if (status === 'error') {
        headGroupRef.current.rotation.z = Math.sin(t * 25) * 0.05;
      } else {
        headGroupRef.current.rotation.x = Math.sin(t * 1.6) * 0.02;
        headGroupRef.current.rotation.y = Math.sin(t * 1.1) * 0.03;
        headGroupRef.current.rotation.z = 0;
      }
    }

    // 5. Ear pod light pulse in listening state
    if (leftEarLightRef.current && rightEarLightRef.current) {
      const pulse = status === 'listening' ? 1.5 + Math.sin(t * 6) * 0.5 : 0.4;
      leftEarLightRef.current.intensity = pulse;
      rightEarLightRef.current.intensity = pulse;
    }

    // 6. Arm gesturing
    if (leftArmRef.current && rightArmRef.current) {
      if (status === 'speaking') {
        leftArmRef.current.rotation.z = -0.32 + Math.sin(t * 7) * 0.14;
        rightArmRef.current.rotation.z = 0.32 - Math.sin(t * 7 + 0.8) * 0.14;
      } else {
        const armSway = Math.sin(t * 2.2) * 0.04;
        leftArmRef.current.rotation.z = -0.28 + armSway;
        rightArmRef.current.rotation.z = 0.28 - armSway;
      }
    }

    // 7. Soft shadow scaling with bob
    if (shadowMeshRef.current) {
      const shadowScale = 1.0 - bobOffset * 1.2;
      shadowMeshRef.current.scale.set(shadowScale, shadowScale, shadowScale);
    }
  });

  return (
    <group ref={robotGroupRef} position={[0, -0.05, 0]}>
      {/* Studio Lighting Setup matching Reference Aurora Palette */}
      <ambientLight intensity={1.15} />
      {/* Lavender rim light from top-left */}
      <directionalLight position={[-4, 5, 2]} intensity={1.6} color="#D8D2FB" />
      {/* Warm peach fill light from right */}
      <directionalLight position={[4, -1, 3]} intensity={1.5} color="#FFA566" />
      {/* Front key fill */}
      <directionalLight position={[0, 2, 4]} intensity={1.2} color="#FFFFFF" />

      {/* Ear Pod Lights */}
      <pointLight ref={leftEarLightRef} position={[-1.2, 0.45, 0]} intensity={0.5} color="#B9AEFF" distance={3} />
      <pointLight ref={rightEarLightRef} position={[1.2, 0.45, 0]} intensity={0.5} color="#B9AEFF" distance={3} />

      {/* Hover Lavender Halo Glow (Behind Robot) */}
      <mesh ref={hoverRingRef} position={[0, 0, -0.4]}>
        <ringGeometry args={[1.2, 1.85, 36]} />
        <meshBasicMaterial color="#B9AEFF" transparent opacity={0.0} side={THREE.DoubleSide} />
      </mesh>

      {/* --- INVISIBLE GENEROUS POINTER HIT TARGET --- */}
      <mesh
        position={[0, 0, 0.2]}
        onClick={onToggleSession}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
        visible={false}
      >
        <boxGeometry args={[2.8, 3.2, 2.0]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* --- HEAD GROUP --- */}
      <group ref={headGroupRef} position={[0, 0.45, 0]}>
        {/* Main Glossy White Helmet / Shell */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.9, 36, 36]} />
          <meshStandardMaterial
            color={whiteShellColor}
            roughness={0.16}
            metalness={0.08}
          />
        </mesh>

        {/* Head-Seam Neon Lime Accent Ring */}
        <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.88, 0.02, 16, 48]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* Curved Front Screen Visor (Conformal to Head Sphere, No Protruding Boxes) */}
        <mesh position={[0, 0.02, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.91, 0.91, 0.52, 32, 1, true, -Math.PI / 3.4, Math.PI / 1.7]} />
          <meshStandardMaterial
            map={faceTexture}
            roughness={0.12}
            metalness={0.4}
            side={THREE.FrontSide}
          />
        </mesh>

        {/* Visor Frame Accent Border */}
        <mesh position={[0, 0.02, 0.72]}>
          <boxGeometry args={[1.04, 0.54, 0.02]} />
          <meshBasicMaterial color="#0B0B12" transparent opacity={0.8} />
        </mesh>

        {/* --- LEFT EAR POD --- */}
        <group position={[-0.94, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.04, 24]} />
            <meshBasicMaterial color={neonColor} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.24, 24]} />
            <meshStandardMaterial color={lavenderTorsoColor} roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0, -0.26, 0]}>
            <sphereGeometry args={[0.24, 24, 16]} />
            <meshStandardMaterial color={whiteShellColor} roughness={0.18} />
          </mesh>
        </group>

        {/* --- RIGHT EAR POD --- */}
        <group position={[0.94, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.04, 24]} />
            <meshBasicMaterial color={neonColor} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.24, 24]} />
            <meshStandardMaterial color={lavenderTorsoColor} roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0, -0.26, 0]}>
            <sphereGeometry args={[0.24, 24, 16]} />
            <meshStandardMaterial color={whiteShellColor} roughness={0.18} />
          </mesh>
        </group>
      </group>

      {/* --- NECK ACCENT RING --- */}
      <mesh position={[0, -0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.035, 16, 36]} />
        <meshBasicMaterial color={neonColor} />
      </mesh>

      {/* --- TORSO (Periwinkle Lavender Rounded Egg Body) --- */}
      <group position={[0, -0.85, 0]}>
        {/* Main Lavender Body Shell */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.68, 32, 32]} />
          <meshStandardMaterial
            color={lavenderTorsoColor}
            roughness={0.25}
            metalness={0.15}
          />
        </mesh>

        {/* White Collar / Chest Center Shield */}
        <mesh position={[0, 0.12, 0.38]} rotation={[-0.1, 0, 0]}>
          <sphereGeometry args={[0.38, 24, 24]} />
          <meshStandardMaterial
            color={whiteShellColor}
            roughness={0.2}
            metalness={0.08}
          />
        </mesh>

        {/* Torso Lower Base Floating Core */}
        <mesh position={[0, -0.45, 0]}>
          <sphereGeometry args={[0.34, 24, 24]} />
          <meshStandardMaterial color="#2B2352" roughness={0.4} />
        </mesh>
      </group>

      {/* --- LEFT ARM (Thin White Capsules, Neon Wrist, Claw Hand) --- */}
      <group ref={leftArmRef} position={[-0.68, -0.72, 0]}>
        {/* Shoulder Joint Ball */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={whiteShellColor} roughness={0.18} />
        </mesh>

        {/* Upper Arm Capsule (Thin White Shell) */}
        <mesh position={[-0.22, 0.16, 0.1]} rotation={[0, 0, -0.65]}>
          <capsuleGeometry args={[0.075, 0.28, 12, 12]} />
          <meshStandardMaterial color={whiteShellColor} roughness={0.2} />
        </mesh>

        {/* Elbow Joint & Neon Accent */}
        <mesh position={[-0.38, 0.34, 0.18]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* Forearm Capsule angled upward (White Shell) */}
        <mesh position={[-0.48, 0.58, 0.26]} rotation={[0.2, 0, -0.2]}>
          <capsuleGeometry args={[0.07, 0.28, 12, 12]} />
          <meshStandardMaterial color={whiteShellColor} roughness={0.2} />
        </mesh>

        {/* Wrist Neon Ring */}
        <mesh position={[-0.54, 0.78, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.09, 0.02, 12, 24]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* 3-Finger Claw Hand */}
        <group position={[-0.56, 0.88, 0.34]}>
          <mesh position={[-0.06, 0.08, 0]} rotation={[0, 0, -0.3]}>
            <capsuleGeometry args={[0.03, 0.12, 8, 8]} />
            <meshStandardMaterial color={whiteShellColor} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.11, 0]}>
            <capsuleGeometry args={[0.03, 0.13, 8, 8]} />
            <meshStandardMaterial color={whiteShellColor} roughness={0.2} />
          </mesh>
          <mesh position={[0.06, 0.08, 0]} rotation={[0, 0, 0.3]}>
            <capsuleGeometry args={[0.03, 0.12, 8, 8]} />
            <meshStandardMaterial color={whiteShellColor} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* --- RIGHT ARM (Thin White Capsules, Neon Wrist, Claw Hand) --- */}
      <group ref={rightArmRef} position={[0.68, -0.72, 0]}>
        {/* Shoulder Joint Ball */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={whiteShellColor} roughness={0.18} />
        </mesh>

        {/* Upper Arm Capsule (Thin White Shell) */}
        <mesh position={[0.22, 0.16, 0.1]} rotation={[0, 0, 0.65]}>
          <capsuleGeometry args={[0.075, 0.28, 12, 12]} />
          <meshStandardMaterial color={whiteShellColor} roughness={0.2} />
        </mesh>

        {/* Elbow Joint & Neon Accent */}
        <mesh position={[0.38, 0.34, 0.18]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* Forearm Capsule angled upward (White Shell) */}
        <mesh position={[0.48, 0.58, 0.26]} rotation={[0.2, 0, 0.2]}>
          <capsuleGeometry args={[0.07, 0.28, 12, 12]} />
          <meshStandardMaterial color={whiteShellColor} roughness={0.2} />
        </mesh>

        {/* Wrist Neon Ring */}
        <mesh position={[0.54, 0.78, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.09, 0.02, 12, 24]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* 3-Finger Claw Hand */}
        <group position={[0.56, 0.88, 0.34]}>
          <mesh position={[-0.06, 0.08, 0]} rotation={[0, 0, -0.3]}>
            <capsuleGeometry args={[0.03, 0.12, 8, 8]} />
            <meshStandardMaterial color={whiteShellColor} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.11, 0]}>
            <capsuleGeometry args={[0.03, 0.13, 8, 8]} />
            <meshStandardMaterial color={whiteShellColor} roughness={0.2} />
          </mesh>
          <mesh position={[0.06, 0.08, 0]} rotation={[0, 0, 0.3]}>
            <capsuleGeometry args={[0.03, 0.12, 8, 8]} />
            <meshStandardMaterial color={whiteShellColor} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* --- SOFT DIFFUSED RADIAL SHADOW (No Dark Flat Quads) --- */}
      <mesh ref={shadowMeshRef} position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 2.0]} />
        <meshBasicMaterial
          map={shadowTexture}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export const RobotMascot = NovaBot;
export default NovaBot;
