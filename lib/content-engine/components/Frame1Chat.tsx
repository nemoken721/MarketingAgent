/**
 * Frame 1: "The Talk" (LINE風チャット)
 *
 * Design System v2.0 Section 2.1 準拠
 *
 * Visual Concept: 親近感、リアルな相談
 *
 * Layout:
 * - Background: bg-slate-100 (薄いグレー)
 * - Customer Bubble (左): bg-white, text-slate-800, rounded-2xl rounded-tl-none, shadow-sm
 * - Shop Bubble (右): bg-[var(--primary-color)], text-white, rounded-2xl rounded-tr-none, shadow-md
 *
 * Typography (Global Rules):
 * - Font: 'Noto Sans JP', sans-serif
 * - Line Height: leading-relaxed (1.625)
 * - Letter Spacing: tracking-wide (0.025em)
 * - Text Color: text-slate-800 (not pure black)
 *
 * Motion (Reels):
 * - Sequence: 会話のタイムスタンプ順に、下から Slide-Up + Fade-In
 * - Timing: 1吹き出しにつき 1.5秒〜2.0秒 の間隔
 */

import React from "react";
import { Canvas } from "./Canvas";
import type { Frame1Props, ChatMessage } from "../types";

/** 吹き出しコンポーネント */
function ChatBubble({
  message,
  isShop,
}: {
  message: ChatMessage;
  isShop: boolean;
}) {
  return (
    <div
      className={`flex w-full ${isShop ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`
          max-w-[75%]
          px-6 py-4
          font-sans
          text-2xl
          leading-relaxed
          tracking-wide
          ${
            isShop
              ? // Shop Bubble (右): ブランドカラー背景
                `bg-[var(--primary-color)] text-white
                 rounded-2xl rounded-tr-none
                 shadow-md shadow-slate-400/20`
              : // Customer Bubble (左): 白背景
                `bg-white text-slate-800
                 rounded-2xl rounded-tl-none
                 shadow-sm shadow-slate-400/20`
          }
        `}
        style={{
          // CSS変数から角丸を適用
          borderRadius: isShop
            ? "var(--radius-md) 0 var(--radius-md) var(--radius-md)"
            : "0 var(--radius-md) var(--radius-md) var(--radius-md)",
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

/** ヘッダーコンポーネント (LINEのトーク画面風) */
function ChatHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center py-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <span className="font-sans text-xl font-medium text-slate-700 tracking-wide">
        {title}
      </span>
    </div>
  );
}

/** Frame 1 メインコンポーネント */
export function Frame1Chat({
  aspectRatio,
  messages,
  brand,
  headerTitle,
}: Frame1Props) {
  return (
    <Canvas
      aspectRatio={aspectRatio}
      brand={brand}
      bgClassName="bg-slate-100"
    >
      {/* メインコンテンツエリア */}
      <div className="flex flex-col h-full">
        {/* ヘッダー (オプション) */}
        {headerTitle && <ChatHeader title={headerTitle} />}

        {/* チャットエリア */}
        <div className="flex-1 flex flex-col justify-end px-6 pb-8 overflow-hidden">
          {/* メッセージリスト */}
          <div className="flex flex-col gap-6">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isShop={message.sender === "shop"}
              />
            ))}
          </div>
        </div>
      </div>
    </Canvas>
  );
}

/** サンプルデータ */
export const SAMPLE_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "customer",
    content: "髪のパサつきが気になるんですが、おすすめのケア方法ありますか？",
  },
  {
    id: "2",
    sender: "shop",
    content: "ご相談ありがとうございます！まずは毎日のトリートメントから始めてみませんか？",
  },
  {
    id: "3",
    sender: "customer",
    content: "トリートメントですか！どんなものがいいですか？",
  },
  {
    id: "4",
    sender: "shop",
    content: "お客様の髪質だと、保湿成分が多いものがおすすめです。次回のご来店時に詳しくご説明しますね！",
  },
];
