"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

export interface HoverBorderGradientProps {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
  as?: React.ElementType;
  duration?: number;
  clockwise?: boolean;
  gradientColors?: string[];
}

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Component = "button",
  duration = 1,
  clockwise = true,
  gradientColors = ["#06b6d4", "#8b5cf6", "#d946ef"],
  ...props
}: HoverBorderGradientProps & React.HTMLAttributes<HTMLElement>) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = clockwise
      ? (currentIndex - 1 + directions.length) % directions.length
      : (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(20.7% 50% at 50% 0%, " + gradientColors.join(", ") + " 100%)",
    LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, " + gradientColors.join(", ") + " 100%)",
    BOTTOM: "radial-gradient(20.7% 50% at 50% 100%, " + gradientColors.join(", ") + " 100%)",
    RIGHT: "radial-gradient(16.2% 41.199999999999996% at 100% 50%, " + gradientColors.join(", ") + " 100%)",
  };

  const highlight =
    "radial-gradient(75% 181.15942028985506% at 50% 50%, " +
    gradientColors[0] +
    " 0%, rgba(255, 255, 255, 0) 100%)";

  useEffect(() => {
    if (!hovered) {
      const interval = setInterval(() => {
        setDirection((prevState) => rotateDirection(prevState));
      }, duration * 1000);
      return () => clearInterval(interval);
    }
  }, [hovered, duration, clockwise]);

  return (
    <Component
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex rounded-2xl transition duration-500 items-center justify-center overflow-visible",
        containerClassName
      )}
      {...props}
    >
      <div
        className={cn(
          "w-auto text-white flex items-center justify-center",
          className
        )}
      >
        {children}
      </div>
      <motion.div
        className={cn(
          "absolute inset-0 overflow-visible rounded-2xl",
          "opacity-0 group-hover:opacity-100"
        )}
        style={{
          filter: "blur(2px)",
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered ? [movingMap[direction], highlight] : movingMap[direction],
        }}
        transition={{ ease: "linear", duration: duration ?? 1 }}
      />
      <div className="absolute inset-[2px] rounded-2xl bg-background" />
    </Component>
  );
}
