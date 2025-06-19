'use client';

import { useDisableBounceScroll } from '@/hooks/use-mobile';

/**
 * バウンススクロールを無効にするコンポーネント
 * アプリケーション全体でバウンススクロールを無効化するために使用
 */
export function BounceScrollDisabler() {
  useDisableBounceScroll();
  
  // このコンポーネントは副作用のみを提供するため、何もレンダリングしない
  return null;
} 