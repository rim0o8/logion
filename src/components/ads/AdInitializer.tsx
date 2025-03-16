'use client';

import { initializeAds } from '@/lib/ads/webAdManager';
import { useEffect } from 'react';

export function AdInitializer() {
  useEffect(() => {
    // 広告の初期化
    initializeAds();
  }, []);
  
  return null;
} 