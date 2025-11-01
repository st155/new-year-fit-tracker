import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const MotionDiv = motion.div as any;
  return (
    <MotionDiv
      className={cn("rounded-md bg-muted", className)} 
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      {...props} 
    />
  );
}

export { Skeleton };
