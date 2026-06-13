'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  function sair() {
    localStorage.removeItem('mia_auth');
    router.replace('/login');
  }

  const tabs = [
    { href: '/dashboard', label: 'Visão geral' },
    { href: '/painel', label: 'Cobranças' },
  ];

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="eyebrow text-muted">Mia Utilidades</p>
          <h1 className="font-display text-xl font-bold leading-none mt-1">
            Cobranças
          </h1>
        </div>
        <button onClick={sair} className="text-muted hover:text-ink p-2 -mr-2" title="Sair">
          <LogOut size={18} />
        </button>
      </div>
      <nav className="flex gap-1 bg-card border border-line rounded-xl p-1">
        {tabs.map((t) => {
          const ativo = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 text-center text-sm rounded-lg py-2 transition ${
                ativo ? 'bg-ink text-paper font-medium' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
