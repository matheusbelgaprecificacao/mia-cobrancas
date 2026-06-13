'use client';

import AuthGuard from '@/components/AuthGuard';
import Painel from '@/components/Painel';

export default function PainelPage() {
  return (
    <AuthGuard>
      <Painel />
    </AuthGuard>
  );
}
