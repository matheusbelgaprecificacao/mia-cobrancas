'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);

  function entrar() {
    const correta = process.env.NEXT_PUBLIC_APP_PASSWORD;
    if (senha === correta) {
      localStorage.setItem('mia_auth', 'ok');
      router.replace('/painel');
    } else {
      setErro(true);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-muted mb-2">Mia Utilidades</p>
        <h1 className="font-display text-3xl font-bold mb-1">Cobranças</h1>
        <p className="text-ink-soft text-sm mb-8">
          Controle quem te deve, multas e lembretes.
        </p>

        <div className="bg-card border border-line rounded-2xl p-5">
          <label className="eyebrow text-muted block mb-2">Senha</label>
          <div className="flex items-center gap-2 border border-line rounded-xl px-3 py-2 bg-paper">
            <Lock size={16} className="text-muted shrink-0" />
            <input
              type="password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && entrar()}
              placeholder="••••••••"
              className="bg-transparent outline-none w-full text-ink"
              autoFocus
            />
          </div>

          {erro && (
            <p className="text-amber text-sm mt-2">Senha incorreta. Tente de novo.</p>
          )}

          <button
            onClick={entrar}
            className="w-full mt-4 bg-ink text-paper rounded-xl py-3 font-medium hover:opacity-90 transition"
          >
            Entrar
          </button>
        </div>
      </div>
    </main>
  );
}
