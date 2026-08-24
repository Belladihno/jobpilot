/* Manual smoke test: publish -> consume one message through the real broker.
   Usage: pnpm -C backend exec node scripts/rabbit-smoke.cjs */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

async function main() {
  loadEnv();
  const amqp = require('amqplib');
  const user = encodeURIComponent(process.env.RABBITMQ_USERNAME);
  const pass = encodeURIComponent(process.env.RABBITMQ_PASSWORD);
  const host = process.env.RABBITMQ_HOST;
  const port = process.env.RABBITMQ_PORT;
  const vhost = process.env.RABBITMQ_VHOST || '/';
  const url = `amqp://${user}:${pass}@${host}:${port}${vhost}`;

  console.log(`Connecting ${host}:${port}${vhost} ...`);
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();

  const exchange = 'smoke.test';
  const queue = 'smoke.test.queue';
  await channel.assertExchange(exchange, 'direct', { durable: false });
  await channel.assertQueue(queue, { durable: false });
  await channel.bindQueue(queue, exchange, 'smoke');
  await channel.publish(exchange, 'smoke', Buffer.from('ping'));

  const received = await new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new Error('timeout')), 5000);
    channel.consume(queue, (msg) => {
      if (msg) {
        channel.ack(msg);
        clearTimeout(timer);
        resolvePromise(msg.content.toString());
      }
    });
  });

  console.log(`ROUND TRIP OK: received "${received}"`);
  await channel.deleteQueue(queue);
  await channel.deleteExchange(exchange);
  await channel.close();
  await connection.close();
}

main().catch((err) => {
  console.error('SMOKE FAILED:', err.message);
  process.exit(1);
});
