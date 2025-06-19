import { useEffect, useState } from 'react';
import { disableBounceScroll } from '@/lib/utils';

const MOBILE_BREAKPOINT = 768;

// 後方互換性のための元の関数
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // モバイルデバイスかどうかを判定
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();

    // リサイズ時に再チェック
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener('resize', handleResize);

    // モバイルデバイスの場合、バウンススクロールを無効化
    if (isMobile) {
      const cleanup = disableBounceScroll();
      
      return () => {
        cleanup();
        window.removeEventListener('resize', handleResize);
      };
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile]);

  return { isMobile };
}

/**
 * バウンススクロール無効化専用のフック
 */
export function useDisableBounceScroll() {
  useEffect(() => {
    const cleanup = disableBounceScroll();
    
    return cleanup;
  }, []);
}
