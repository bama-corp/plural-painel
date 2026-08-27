/**
 * Testa se a rede consegue alcançar o Supabase.
 * Correr: node scripts/test-db-connection.js
 */
require('dotenv').config();

const host = 'aws-1-eu-west-1.pooler.supabase.com';
const ports = [6543, 5432];

async function testPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    const timeout = 5000;
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve({ port, ok: true });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, ok: false, error: 'timeout' });
    });
    socket.on('error', (err) => {
      resolve({ port, ok: false, error: err.message });
    });
    socket.connect(port, host);
  });
}

async function main() {
  console.log('A testar conectividade com', host, '...\n');
  for (const port of ports) {
    const r = await testPort(port);
    console.log(r.ok ? `  Porta ${port}: OK` : `  Porta ${port}: FALHOU (${r.error})`);
  }
  console.log('\nSe ambas falharem: rede/firewall a bloquear ou projeto Supabase pausado.');
  console.log('No dashboard Supabase, verifica se o projeto está Active (não Paused).');
}

main();
