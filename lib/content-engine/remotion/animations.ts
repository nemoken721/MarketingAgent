/**
 * Marty Content Engine - Remotion Animation Utilities
 *
 * Design System v2.0 準拠のアニメーションユーティリティ
 */

import { interpolate, spring, Easing } from "remotion";

/** アニメーション設定 */
export const ANIMATION_CONFIG = {
  /** チャットバブルの表示間隔 (フレーム数) */
  CHAT_BUBBLE_INTERVAL: 45, // 1.5秒 @30fps
  /** フェードイン時間 (フレーム数) */
  FADE_IN_DURATION: 15, // 0.5秒
  /** スライドイン時間 (フレーム数) */
  SLIDE_IN_DURATION: 20, // 約0.67秒
  /** タイプライター速度 (1文字あたりのフレーム数) */
  TYPEWRITER_SPEED: 3, // 1文字0.1秒
  /** プログレスバー減少時間 (フレーム数) */
  PROGRESS_DURATION: 180, // 6秒
  /** Ken Burns ズーム量 */
  KEN_BURNS_SCALE: 1.1,
};

/**
 * フェードイン
 */
export function fadeIn(
  frame: number,
  startFrame: number,
  duration: number = ANIMATION_CONFIG.FADE_IN_DURATION
): number {
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/**
 * スライドイン (下から上)
 */
export function slideInFromBottom(
  frame: number,
  startFrame: number,
  fps: number,
  offset: number = 50
): { translateY: number; opacity: number } {
  const springConfig = {
    fps,
    mass: 0.5,
    damping: 15,
    stiffness: 100,
  };

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: springConfig,
  });

  const translateY = interpolate(progress, [0, 1], [offset, 0]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return { translateY, opacity };
}

/**
 * スライドイン (左から)
 */
export function slideInFromLeft(
  frame: number,
  startFrame: number,
  fps: number,
  offset: number = 100
): { translateX: number; opacity: number } {
  const springConfig = {
    fps,
    mass: 0.5,
    damping: 12,
    stiffness: 80,
  };

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: springConfig,
  });

  const translateX = interpolate(progress, [0, 1], [-offset, 0]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return { translateX, opacity };
}

/**
 * Ken Burns Effect (ゆっくりズームアウト)
 */
export function kenBurnsZoomOut(
  frame: number,
  totalFrames: number,
  startScale: number = ANIMATION_CONFIG.KEN_BURNS_SCALE
): number {
  return interpolate(frame, [0, totalFrames], [startScale, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

/**
 * タイプライター効果 (表示する文字数を返す)
 */
export function typewriter(
  frame: number,
  startFrame: number,
  totalLength: number,
  speed: number = ANIMATION_CONFIG.TYPEWRITER_SPEED
): number {
  const elapsed = Math.max(0, frame - startFrame);
  const chars = Math.floor(elapsed / speed);
  return Math.min(chars, totalLength);
}

/**
 * プログレスバー減少
 */
export function progressBarDecrease(
  frame: number,
  startFrame: number,
  duration: number = ANIMATION_CONFIG.PROGRESS_DURATION,
  startValue: number = 100,
  endValue: number = 0
): number {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [startValue, endValue],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
}

/**
 * 点滅効果
 */
export function blink(
  frame: number,
  startFrame: number,
  interval: number = 10
): number {
  const elapsed = frame - startFrame;
  if (elapsed < 0) return 1;
  return Math.floor(elapsed / interval) % 2 === 0 ? 1 : 0.5;
}

/**
 * 順次表示 (配列のインデックスに応じた遅延)
 */
export function staggeredDelay(
  index: number,
  interval: number = ANIMATION_CONFIG.CHAT_BUBBLE_INTERVAL
): number {
  return index * interval;
}
