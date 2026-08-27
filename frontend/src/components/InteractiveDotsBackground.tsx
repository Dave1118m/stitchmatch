import React, { useEffect, useRef } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';

interface InteractiveDotsBackgroundProps {
  className?: string;
  dotSpacing?: number;
  dotRadius?: number;
  repelRadius?: number;
  repelStrength?: number;
  returnSpeed?: number;
  damping?: number;
}

interface Dot {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  colorAlpha: number;
}

export default function InteractiveDotsBackground({
  className = 'absolute inset-0 z-0 pointer-events-none',
  dotSpacing = 32,
  dotRadius = 2,
  repelRadius = 130,
  repelStrength = 6,
  returnSpeed = 0.08,
  damping = 0.86,
}: InteractiveDotsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDark = useDarkMode();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dots: Dot[] = [];

    // Mouse state
    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      isHovering: false,
    };

    // Initialize/recalculate dots grid
    const initDots = () => {
      const parent = canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      dots = [];
      const cols = Math.ceil(width / dotSpacing) + 1;
      const rows = Math.ceil(height / dotSpacing) + 1;
      const offsetX = (width - (cols - 1) * dotSpacing) / 2;
      const offsetY = (height - (rows - 1) * dotSpacing) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const originX = offsetX + c * dotSpacing;
          const originY = offsetY + r * dotSpacing;
          dots.push({
            originX,
            originY,
            x: originX,
            y: originY,
            vx: 0,
            vy: 0,
            size: dotRadius,
            baseSize: dotRadius,
            colorAlpha: 0.25,
          });
        }
      }
    };

    initDots();

    // Mouse listener on parent or window
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isHovering = true;
    };

    const handleMouseLeave = () => {
      mouse.targetX = -9999;
      mouse.targetY = -9999;
      mouse.isHovering = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouse.targetX = e.touches[0].clientX - rect.left;
        mouse.targetY = e.touches[0].clientY - rect.top;
        mouse.isHovering = true;
      }
    };

    const handleTouchEnd = () => {
      handleMouseLeave();
    };

    // Attach mouse move to parent element or document
    const targetElement = canvas.parentElement || window;
    targetElement.addEventListener('mousemove', handleMouseMove as any, { passive: true });
    targetElement.addEventListener('mouseleave', handleMouseLeave as any, { passive: true });
    targetElement.addEventListener('touchmove', handleTouchMove as any, { passive: true });
    targetElement.addEventListener('touchend', handleTouchEnd as any, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      initDots();
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Animation Loop with spring-damping physics
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse position easing
      if (mouse.isHovering) {
        mouse.x += (mouse.targetX - mouse.x) * 0.35;
        mouse.y += (mouse.targetY - mouse.y) * 0.35;
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      const isDarkMode = isDark;
      const dotBaseColor = isDarkMode ? '148, 163, 184' : '100, 116, 139'; // Slate
      const dotActiveColor = isDarkMode ? '56, 189, 248' : '37, 99, 235';  // Cyan/Blue

      const numDots = dots.length;
      for (let i = 0; i < numDots; i++) {
        const dot = dots[i];

        // Calculate distance from cursor
        const dx = dot.x - mouse.x;
        const dy = dot.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const radiusSq = repelRadius * repelRadius;

        if (distSq < radiusSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          // Radial repulsion force (stronger when closer)
          const normDist = dist / repelRadius;
          const force = (1 - normDist) * repelStrength;
          const angle = Math.atan2(dy, dx);

          // Disperse/scatter equally outward in all directions
          dot.vx += Math.cos(angle) * force;
          dot.vy += Math.sin(angle) * force;

          // Increase size and vibrancy
          dot.size = dot.baseSize + (1 - normDist) * 2.2;
          dot.colorAlpha = Math.min(1, 0.4 + (1 - normDist) * 0.6);
        } else {
          // Fade back to normal size & alpha
          dot.size += (dot.baseSize - dot.size) * 0.1;
          dot.colorAlpha += (0.25 - dot.colorAlpha) * 0.05;
        }

        // Spring force returning dot to original home coordinate
        const homeDx = dot.originX - dot.x;
        const homeDy = dot.originY - dot.y;

        dot.vx += homeDx * returnSpeed;
        dot.vy += homeDy * returnSpeed;

        // Damping / friction
        dot.vx *= damping;
        dot.vy *= damping;

        // Update coordinates
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Render dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, Math.max(0.5, dot.size), 0, Math.PI * 2);

        // Color based on active/displaced state
        const isDisplaced = dot.colorAlpha > 0.35;
        if (isDisplaced) {
          ctx.fillStyle = `rgba(${dotActiveColor}, ${dot.colorAlpha})`;
          ctx.shadowColor = `rgba(${dotActiveColor}, ${dot.colorAlpha * 0.6})`;
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = `rgba(${dotBaseColor}, ${dot.colorAlpha})`;
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      targetElement.removeEventListener('mousemove', handleMouseMove as any);
      targetElement.removeEventListener('mouseleave', handleMouseLeave as any);
      targetElement.removeEventListener('touchmove', handleTouchMove as any);
      targetElement.removeEventListener('touchend', handleTouchEnd as any);
      resizeObserver.disconnect();
    };
  }, [dotSpacing, dotRadius, repelRadius, repelStrength, returnSpeed, damping, isDark]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ willChange: 'transform, opacity' }}
      aria-hidden="true"
    />
  );
}
