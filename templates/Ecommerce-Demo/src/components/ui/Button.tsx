"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  glow?: boolean;
}

export default function Button({
  children,
  className,
  variant = "primary",
  glow = false,
  ...props
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Magnetic and spotlight effect tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCoords({ x, y });
  };

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative overflow-hidden rounded-full font-jakarta font-semibold tracking-wider text-xs uppercase px-8 py-4 transition-all duration-300 active:scale-95 cursor-pointer select-none",
        variant === "primary" && "bg-accent-blue text-white hover:bg-blue-700",
        variant === "secondary" && "bg-surface text-primary-text hover:bg-surface-hover border border-slate-200 shadow-sm",
        variant === "outline" && "bg-transparent text-primary-text border border-slate-300 hover:border-slate-500 hover:bg-slate-100/50",
        variant === "ghost" && "bg-transparent text-primary-text hover:bg-slate-100",
        glow && "blue-glow",
        className
      )}
      {...props}
    >
      {/* Dynamic mouse spot-glow inside the button */}
      {isHovered && (
        <span
          className="absolute rounded-full pointer-events-none bg-accent-blue/10 blur-md"
          style={{
            width: "120px",
            height: "120px",
            left: coords.x - 60,
            top: coords.y - 60,
            transition: "left 0.1s ease, top 0.1s ease",
          }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
