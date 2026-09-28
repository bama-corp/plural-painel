# Alertas do painel com ntfy

Os **alertas internos** (nova sala, cliente, servidor, cron de resumo, etc.) passam pelo [ntfy](https://ntfy.sh).  
As **mensagens a clientes** (lembretes, vencimento, indicação) continuam no WhatsApp.

## Configuração

No `.env` / Vercel:

```env
NTFY_TOPIC="plural-xxxxxxxxxxxxxxxx"   # obrigatório; difícil de adivinhar
# NTFY_BASE_URL="https://ntfy.sh"      # opcional
# NTFY_TOKEN=""                        # opcional (Bearer)
PANEL_PUBLIC_URL="https://plural-painel.vercel.app"  # link ao tocar na notificação
```

Gerar um tópico:

```bash
node -e "console.log('plural-'+require('crypto').randomBytes(8).toString('hex'))"
```

## Subscrever

1. Instala a app **ntfy** (Android / iOS) ou abre https://ntfy.sh no browser.
2. Subscreve o mesmo `NTFY_TOPIC`.
3. Testa: cria uma sala ou chama o cron com `?testAdmin=1`.

## Notas

- Um tópico partilhado: toda a equipa que subscreveu recebe os alertas.
- Sem `NTFY_TOPIC`, os alertas do painel **não** são enviados (aparece aviso nos logs).
