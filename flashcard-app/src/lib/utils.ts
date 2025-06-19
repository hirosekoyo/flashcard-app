import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * バウンススクロールを無効にする関数
 * ネイティブアプリに近い体験を提供するために使用
 */
export function disableBounceScroll() {
  // タッチイベントでのバウンススクロールを防ぐ
  let startY = 0;
  let startX = 0;

  function handleTouchStart(e: TouchEvent) {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
  }

  function handleTouchMove(e: TouchEvent) {
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = Math.abs(currentY - startY);
    const deltaX = Math.abs(currentX - startX);

    // 縦スクロールの場合は、ページの端でのバウンスを防ぐ
    if (deltaY > deltaX) {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      // ページの最上部または最下部でのバウンスを防ぐ
      if ((scrollTop <= 0 && currentY > startY) || 
          (scrollTop + clientHeight >= scrollHeight && currentY < startY)) {
        e.preventDefault();
      }
    }
  }

  // イベントリスナーを追加
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });

  // クリーンアップ関数を返す
  return () => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
  };
}

/**
 * スクロール可能な要素にバウンススクロール無効化を適用
 */
export function disableBounceScrollForElement(element: HTMLElement) {
  let startY = 0;
  let startX = 0;

  function handleTouchStart(e: TouchEvent) {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
  }

  function handleTouchMove(e: TouchEvent) {
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = Math.abs(currentY - startY);
    const deltaX = Math.abs(currentX - startX);

    if (deltaY > deltaX) {
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;

      if ((scrollTop <= 0 && currentY > startY) || 
          (scrollTop + clientHeight >= scrollHeight && currentY < startY)) {
        e.preventDefault();
      }
    }
  }

  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
  };
}
