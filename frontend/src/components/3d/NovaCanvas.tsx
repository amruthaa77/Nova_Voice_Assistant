import React, { Component, ErrorInfo, ReactNode, Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { NovaBot } from './NovaBot';
import { NovaFallback } from './NovaFallback';
import { AssistantStatus } from '../../api/types';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('WebGL Rendering Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface NovaCanvasProps {
  status: AssistantStatus;
  isSessionActive: boolean;
  reducedMotion?: boolean;
  onToggleSession: () => void;
  onEndSession: () => void;
}

export type OrbCanvasProps = NovaCanvasProps;

export const NovaCanvas: React.FC<NovaCanvasProps> = ({
  status,
  isSessionActive,
  reducedMotion = false,
  onToggleSession,
  onEndSession,
}) => {
  const [isWebGLSupported, setIsWebGLSupported] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPressed, setIsPressed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setIsWebGLSupported(false);
      }
    } catch {
      setIsWebGLSupported(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggleSession();
    } else if (e.key === 'Escape' && isSessionActive) {
      e.preventDefault();
      onEndSession();
    }
  };

  const novaAriaLabel = isSessionActive
    ? 'End conversation with Nova'
    : 'Talk to Nova';

  if (!isWebGLSupported || reducedMotion) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={novaAriaLabel}
        aria-pressed={isSessionActive}
        onClick={onToggleSession}
        onKeyDown={handleKeyDown}
        className="cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B9AEFF]/70 rounded-[36px]"
      >
        <NovaFallback status={status} />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={novaAriaLabel}
      aria-pressed={isSessionActive}
      onClick={onToggleSession}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      className="relative w-full h-[280px] sm:h-[340px] md:h-[370px] flex items-center justify-center select-none cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B9AEFF]/70 rounded-[36px] transition-all"
    >
      <WebGLErrorBoundary fallback={<NovaFallback status={status} />}>
        <Suspense fallback={<NovaFallback status={status} />}>
          <Canvas
            camera={{ position: [0, -0.05, 4.4], fov: 42 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            dpr={[1, 2]}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          >
            <NovaBot
              status={status}
              reducedMotion={reducedMotion}
              isHovered={isHovered}
              isPressed={isPressed}
              onToggleSession={onToggleSession}
            />
          </Canvas>
        </Suspense>
      </WebGLErrorBoundary>
    </div>
  );
};

export const OrbCanvas = NovaCanvas;
export default NovaCanvas;
