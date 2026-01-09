/**
 * Framer Motion アニメーション設定
 * 一貫したアニメーションを提供するためのヘルパー
 */

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

// トランジション設定
export const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const smoothTransition = {
  duration: 0.2,
  ease: "easeInOut" as const,
};

export const slowTransition = {
  duration: 0.4,
  ease: "easeInOut" as const,
};

// ホバーアニメーション
export const hoverScale = {
  scale: 1.05,
  transition: smoothTransition,
};

export const hoverLift = {
  y: -4,
  transition: smoothTransition,
};

// スタッガーアニメーション（リスト用）
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItem = fadeInUp;
