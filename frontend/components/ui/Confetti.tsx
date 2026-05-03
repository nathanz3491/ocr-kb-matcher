'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createContext, useContext, ReactNode } from 'react';

interface ConfettiContextType {
  triggerConfetti: () => void;
}

const ConfettiContext = createContext<ConfettiContextType | undefined>(undefined);

export function useConfetti() {
  const context = useContext(ConfettiContext);
  if (!context) {
    return { triggerConfetti: () => {} };
  }
  return context;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

interface ConfettiProviderProps {
  children: ReactNode;
}

export function ConfettiProvider({ children }: ConfettiProviderProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);
  const requestRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);

  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
  ];

  const triggerConfetti = useCallback(() => {
    const newParticles: Particle[] = [];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 15 + 5;
      newParticles.push({
        id: i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    particlesRef.current = newParticles;
    setParticles(newParticles);
    setIsActive(true);
  }, []);

  const animate = useCallback(() => {
    const gravity = 0.5;
    const friction = 0.99;

    particlesRef.current = particlesRef.current
      .map((p) => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + gravity,
        vx: p.vx * friction,
        rotation: p.rotation + p.rotationSpeed,
      }))
      .filter((p) => p.y < window.innerHeight + 100);

    setParticles([...particlesRef.current]);

    if (particlesRef.current.length > 0) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, animate]);

  return (
    <ConfettiContext.Provider value={{ triggerConfetti }}>
      {children}
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                transform: `rotate(${p.rotation}deg)`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          ))}
        </div>
      )}
    </ConfettiContext.Provider>
  );
}

// Simple confetti burst for celebrations
interface ConfettiBurstProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function ConfettiBurst({ trigger, onComplete }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      const newParticles: Particle[] = [];
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
      
      for (let i = 0; i < 100; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: -20,
          vx: (Math.random() - 0.5) * 10,
          vy: Math.random() * 5 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 15,
        });
      }
      
      setParticles(newParticles);
      setIsActive(true);
      
      const timer = setTimeout(() => {
        setIsActive(false);
        onComplete?.();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3,
          vx: p.vx * 0.99,
          rotation: p.rotation + p.rotationSpeed,
        })).filter(p => p.y < window.innerHeight + 50)
      );
    }, 16);
    
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}