import { createApp } from './app';
const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
const server = createApp().listen({ port, host: '0.0.0.0' }, () => {
  console.log(`Veylo is listening on http://0.0.0.0:${port}`);
});
server.on('error', error => { console.error('Server could not start:', error.message); process.exitCode = 1; });
const shutdown = () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10000).unref(); };
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
