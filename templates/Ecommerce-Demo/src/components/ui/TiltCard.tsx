"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function TiltCard({ children, className, ...props }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Get mouse positions relative to card
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert positions to percentages
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    // Calculate tilt angles (max tilt 10 degrees)
    const tiltX = -(y - yc) / 15;
    const tiltY = (x - xc) / 15;
    
    // Calculate shine position
    const shineX = (x / rect.width) * 100;
    const shineY = (y / rect.height) * 100;
    
    setTilt({ x: tiltX, y: tiltY });
    setShine({ x: shineX, y: shineY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative rounded-3xl overflow-hidden transition-all duration-300 ease-out",
        className
      )}
      style={{
        perspective: "1000px",
        transform: isHovered
          ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`
          : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
        transformStyle: "preserve-3d",
      }}
      {...props}
    >
      {/* Light Reflection (Shine Effect) */}
      {isHovered && (
        <div
          className="absolute inset-0 z-10 pointer-events-none opacity-30 mix-blend-overlay"
          style={{
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)`,
          }}
        />
      )}
      <div className="h-full w-full" style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </div>
  );
}
