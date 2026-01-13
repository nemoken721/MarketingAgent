/**
 * Marty Content Engine - Remotion Root
 *
 * Remotionのエントリーポイント
 * 全コンポジションを登録
 */

import React from "react";
import { Composition } from "remotion";
import { Frame1ChatComposition } from "./compositions/Frame1ChatComposition";
import { Frame2MagazineComposition } from "./compositions/Frame2MagazineComposition";
import { Frame3MemoComposition } from "./compositions/Frame3MemoComposition";
import { Frame4CinemaComposition } from "./compositions/Frame4CinemaComposition";
import { Frame5QuizComposition } from "./compositions/Frame5QuizComposition";
import { CANVAS_SPECS } from "../types";

/** デフォルトFPS */
const FPS = 30;

/** デフォルト動画時間 (秒) */
const DEFAULT_DURATION = {
  frame1: 8,  // チャット: 8秒
  frame2: 6,  // マガジン: 6秒
  frame3: 10, // メモ: 10秒
  frame4: 5,  // シネマ: 5秒
  frame5: 8,  // クイズ: 8秒
};

export const RemotionRoot: React.FC = () => {
  // Reels用コンポジション
  const reelsSpec = CANVAS_SPECS.reels;

  return (
    <>
      {/* Frame 1: LINE風チャット */}
      <Composition
        id="Frame1Chat-Reels"
        component={Frame1ChatComposition as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={DEFAULT_DURATION.frame1 * FPS}
        fps={FPS}
        width={reelsSpec.width}
        height={reelsSpec.height}
        defaultProps={{
          aspectRatio: "reels",
          messages: [],
          brand: undefined,
        }}
      />

      {/* Frame 2: 雑誌見出し風 */}
      <Composition
        id="Frame2Magazine-Reels"
        component={Frame2MagazineComposition as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={DEFAULT_DURATION.frame2 * FPS}
        fps={FPS}
        width={reelsSpec.width}
        height={reelsSpec.height}
        defaultProps={{
          aspectRatio: "reels",
          title: "",
          subtitle: undefined,
          decorativeText: undefined,
          backgroundImage: undefined,
          brand: undefined,
        }}
      />

      {/* Frame 3: メモ風 */}
      <Composition
        id="Frame3Memo-Reels"
        component={Frame3MemoComposition as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={DEFAULT_DURATION.frame3 * FPS}
        fps={FPS}
        width={reelsSpec.width}
        height={reelsSpec.height}
        defaultProps={{
          aspectRatio: "reels",
          content: "",
          showLines: true,
          bgStyle: "cream",
          brand: undefined,
        }}
      />

      {/* Frame 4: 映画字幕風 */}
      <Composition
        id="Frame4Cinema-Reels"
        component={Frame4CinemaComposition as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={DEFAULT_DURATION.frame4 * FPS}
        fps={FPS}
        width={reelsSpec.width}
        height={reelsSpec.height}
        defaultProps={{
          aspectRatio: "reels",
          subtitle: "",
          backgroundImage: undefined,
          brand: undefined,
        }}
      />

      {/* Frame 5: クイズ */}
      <Composition
        id="Frame5Quiz-Reels"
        component={Frame5QuizComposition as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={DEFAULT_DURATION.frame5 * FPS}
        fps={FPS}
        width={reelsSpec.width}
        height={reelsSpec.height}
        defaultProps={{
          aspectRatio: "reels",
          question: "",
          options: [],
          questionNumber: 1,
          correctIndex: undefined,
          brand: undefined,
        }}
      />
    </>
  );
};

export default RemotionRoot;
