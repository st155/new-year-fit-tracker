import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("fadeIn");

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage("fadeOut");
    }
  }, [location, displayLocation]);

  return (
    <div
      className={`transition-all duration-300 ${
        transitionStage === "fadeOut" 
          ? "opacity-0 translate-y-2" 
          : "opacity-100 translate-y-0"
      }`}
      onTransitionEnd={() => {
        if (transitionStage === "fadeOut") {
          setTransitionStage("fadeIn");
          setDisplayLocation(location);
        }
      }}
    >
      {children}
    </div>
  );
}
