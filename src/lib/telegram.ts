// Envia uma mensagem para o seu Telegram usando o bot.
// Usa HTML simples (negrito, quebra de linha).
export async function enviarTelegram(texto: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados.');
  }

  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!resp.ok) {
    const erro = await resp.text();
    throw new Error(`Telegram respondeu ${resp.status}: ${erro}`);
  }
}
