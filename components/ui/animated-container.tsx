"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { fadeInUp, smoothTransition } from "@/lib/animations";

interface AnimatedContainerProps extends HTMLMotionProps<"div"> {
  delay?: number;
}

export function AnimatedContainer({
  children,
  delay = 0,
  ...props
}: AnimatedContainerProps) {
  return (
    <motion.div
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      exit={fadeInUp.exit}
      transition={{ ...smoothTransition, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ページ全体をアニメーションするコンテナ
export function PageContainer({
  children,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={smoothTransition}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// カードアニメーション
export function AnimatedCard({
  children,
  delay = 0,
  ...props
}: AnimatedContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ ...smoothTransition, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
