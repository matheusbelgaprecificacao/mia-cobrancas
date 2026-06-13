'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const auth =
      typeof window !== 'undefined' && localStorage.getItem('mia_auth') === 'ok';
    router.replace(auth ? '/dashboard' : '/login');
  }, [router]);

  return null;
}
