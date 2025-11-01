"use client";
import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useState } from "react";

export const CardHoverEffect = ({
  children,
  className,
  containerClassName,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], ["17.5deg", "-17.5deg"]), {
    stiffness: 200,
    damping: 30,
  });

  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], ["-17.5deg", "17.5deg"]), {
    stiffness: 200,
    damping: 30,
  });

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    return { x: xPct, y: yPct };
  }

  function handleMouseEnter(event: React.MouseEvent<HTMLDivElement>) {
    setIsHovered(true);
    const { x, y } = handleMouseMove(event);
    mouseX.set(x);
    mouseY.set(y);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.div
      onMouseMove={(e) => {
        const { x, y } = handleMouseMove(e);
        mouseX.set(x);
        mouseY.set(y);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateY: isHovered ? rotateY : "0deg",
        rotateX: isHovered ? rotateX : "0deg",
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "relative rounded-2xl cursor-pointer group/card",
        "transition-all duration-200 ease-linear",
        containerClassName
      )}
    >
      <div
        style={{
          transform: "translateZ(50px)",
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "rounded-2xl overflow-hidden relative",
          "border border-white/10",
          "shadow-lg hover:shadow-2xl",
          "transition-shadow duration-300",
          className
        )}
      >
        {/* Spotlight effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(
              600px circle at ${mouseX.get() * 100}% ${mouseY.get() * 100}%,
              rgba(6, 182, 212, 0.1),
              transparent 40%
            )`,
          }}
        />
        
        <div className="relative z-10">{children}</div>
      </div>
    </motion.div>
  );
};
