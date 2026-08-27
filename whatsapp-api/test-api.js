/**
 * Script para testar a API WhatsApp (correr com: node test-api.js)
 * Requer: API a correr em http://localhost:3002 (npm start noutro terminal)
 */

const BASE = process.env.WHATSAPP_API_URL || 'http://localhost:3002'
const TOKEN = process.env.WHATSAPP_TOKEN || ''

async function test() {
  console.log('A testar API em', BASE, '...\n')

  // 1. GET /status
  try {
    const statusRes = await fetch(`${BASE}/status`)
    const status = await statusRes.json()
    console.log('GET /status:', status)
    if (!status.connected) {
      console.log('  → Escaneia o QR Code no terminal da API para conectar o WhatsApp.\n')
    }
  } catch (e) {
    console.error('GET /status falhou. A API está a correr? (npm start)', e.message)
    process.exit(1)
  }

  // 2. POST /send (mensagem de teste – altera o número para o teu)
  const testPhone = process.argv[2] || '244922858762'
  const testMessage = 'Teste da API WhatsApp Rove+. Se recebeste, está a funcionar.'

  console.log('POST /send →', testPhone)
  const headers = { 'Content-Type': 'application/json' }
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`

  try {
    const sendRes = await fetch(`${BASE}/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: testPhone, message: testMessage }),
    })
    const data = await sendRes.json()
    console.log('Resposta:', data)
    if (data.success) {
      console.log('  → Verifica o WhatsApp no telemóvel', testPhone)
    } else {
      console.log('  → Erro:', data.error)
    }
  } catch (e) {
    console.error('POST /send falhou:', e.message)
  }
}

test()
