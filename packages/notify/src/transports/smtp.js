import { Socket } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

/**
 * Create a minimal SMTP transport (zero-dep).
 * For production, consider nodemailer.
 * @param {{ host: string, port: number, secure?: boolean, auth?: { user: string, pass: string } }} config
 * @returns {{ send: (email: { to: string, from: string, subject: string, html: string, text?: string }) => Promise<void> }}
 */
export function createSmtpTransport(config) {
  const { host, port, secure = false, auth } = config;

  function readLine(socket) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const onData = (chunk) => {
        buffer += chunk.toString();
        if (buffer.includes('\r\n')) {
          socket.removeListener('data', onData);
          socket.removeListener('error', reject);
          resolve(buffer.trim());
        }
      };
      socket.on('data', onData);
      socket.on('error', reject);
    });
  }

  function writeLine(socket, line) {
    return new Promise((resolve, reject) => {
      socket.write(line + '\r\n', (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async function command(socket, cmd) {
    await writeLine(socket, cmd);
    return readLine(socket);
  }

  return {
    async send(email) {
      const { to, from, subject, html, text } = email;

      const socket = await new Promise((resolve, reject) => {
        if (secure) {
          const sock = tlsConnect({ host, port, rejectUnauthorized: false }, () => resolve(sock));
          sock.on('error', reject);
        } else {
          const sock = new Socket();
          sock.connect(port, host, () => resolve(sock));
          sock.on('error', reject);
        }
      });

      // Read greeting
      await readLine(socket);

      // EHLO
      await command(socket, `EHLO ${host}`);

      // AUTH LOGIN if credentials provided
      if (auth) {
        await command(socket, 'AUTH LOGIN');
        await command(socket, Buffer.from(auth.user).toString('base64'));
        await command(socket, Buffer.from(auth.pass).toString('base64'));
      }

      // MAIL FROM
      await command(socket, `MAIL FROM:<${from}>`);

      // RCPT TO
      await command(socket, `RCPT TO:<${to}>`);

      // DATA
      await command(socket, 'DATA');

      const boundary = `----boundary${Date.now()}`;
      const body = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        text || '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        html,
        `--${boundary}--`,
        '.',
      ].join('\r\n');

      await command(socket, body);

      // QUIT
      await command(socket, 'QUIT');

      socket.destroy();
    },
  };
}
