import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

function localDemoAdminPlugin(env: Record<string, string>): Plugin {
  const sessions = new Map<string, number>();
  const failedAttempts = new Map<string, { count: number; startedAt: number }>();
  const sessionLifetime = 12 * 60 * 60 * 1000;

  const sendJson = (response: ServerResponse, status: number, body: object) => {
    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(body));
  };
  const isLocalRequest = (request: IncomingMessage) => {
    const address = request.socket.remoteAddress;
    return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
  };
  const matchesSecret = (entered: string, expected: string) => {
    const enteredHash = createHash('sha256').update(entered).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(enteredHash, expectedHash);
  };

  return {
    name: 'local-demo-admin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__local-demo/admin-login', (request, response) => {
        if (!isLocalRequest(request)) return sendJson(response, 403, { error: 'Local demo login is only available on this computer.' });
        if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });

        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk: string) => {
          body += chunk;
          if (body.length > 4096) {
            sendJson(response, 413, { error: 'Login request is too large.' });
            request.destroy();
          }
        });
        request.on('end', () => {
          let credentials: { username?: unknown; password?: unknown; secretCode?: unknown };
          try {
            const parsed: unknown = JSON.parse(body);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              return sendJson(response, 400, { error: 'Invalid login request.' });
            }
            credentials = parsed as { username?: unknown; password?: unknown; secretCode?: unknown };
          } catch {
            return sendJson(response, 400, { error: 'Invalid login request.' });
          }

          const expectedUsername = env.LOCAL_DEMO_ADMIN_USERNAME;
          const expectedPassword = env.LOCAL_DEMO_ADMIN_PASSWORD;
          const expectedSecretCode = env.LOCAL_DEMO_ADMIN_SECRET_CODE;
          if (!expectedUsername || !expectedPassword || !expectedSecretCode) {
            return sendJson(response, 503, { error: 'Local demo login is not configured in .env.local.' });
          }

          const address = request.socket.remoteAddress || 'unknown';
          const attempt = failedAttempts.get(address);
          const now = Date.now();
          const withinWindow = !!attempt && now - attempt.startedAt < 15 * 60 * 1000;
          if (withinWindow && attempt.count >= 5) {
            return sendJson(response, 429, { error: 'Too many attempts. Wait 15 minutes and try again.' });
          }

          const values = [credentials.username, credentials.password, credentials.secretCode];
          const validTypes = values.every((value) => typeof value === 'string' && value.length <= 256);
          const valid = validTypes
            && matchesSecret(credentials.username as string, expectedUsername)
            && matchesSecret(credentials.password as string, expectedPassword)
            && matchesSecret(credentials.secretCode as string, expectedSecretCode);
          if (!valid) {
            const count = withinWindow ? attempt.count + 1 : 1;
            failedAttempts.set(address, { count, startedAt: withinWindow ? attempt.startedAt : now });
            return sendJson(response, 401, { error: 'Invalid username, password, or secret code.' });
          }

          failedAttempts.delete(address);
          const token = randomBytes(32).toString('hex');
          sessions.set(token, now + sessionLifetime);
          return sendJson(response, 200, { token });
        });
        request.on('error', (error) => {
          if (!response.headersSent) sendJson(response, 400, { error: 'Could not read the login request.' });
          server.config.logger.error(error.message);
        });
        return undefined;
      });

      server.middlewares.use('/__local-demo/admin-session', (request, response) => {
        if (!isLocalRequest(request)) return sendJson(response, 403, { error: 'Local demo sessions are only available on this computer.' });
        if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
        const authorization = request.headers.authorization || '';
        const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
        const expiresAt = sessions.get(token);
        if (!expiresAt || expiresAt <= Date.now()) {
          sessions.delete(token);
          return sendJson(response, 401, { error: 'Local demo session expired.' });
        }
        return sendJson(response, 200, { authenticated: true });
      });

      server.middlewares.use('/__local-demo/admin-logout', (request, response) => {
        if (!isLocalRequest(request)) return sendJson(response, 403, { error: 'Local demo sessions are only available on this computer.' });
        if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
        const authorization = request.headers.authorization || '';
        const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
        sessions.delete(token);
        return sendJson(response, 200, { signedOut: true });
      });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const plugins: PluginOption[] = [react()];
  if (command === 'serve') {
    plugins.push(localDemoAdminPlugin(loadEnv(mode, process.cwd(), '')));
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
