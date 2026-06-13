'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('mia_auth') === 'ok';
    if (!auth) router.replace('/login');
    else setOk(true);
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}
