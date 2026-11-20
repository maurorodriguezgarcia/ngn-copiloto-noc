import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Content, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './src/agentInstructions.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = 'gemini-4-hydrogen';

interface ChatInputMessage {
  role: 'user' | 'model';
  text: string;
}

function createGenAIClient(): GoogleGenAI {
  const apiKey =
    process.env.NGN_GEMINI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY;

  if (!apiKey) {
    throw new Error('NGN_GEMINI_KEY no está configurada en el servidor.');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      model: GEMINI_MODEL,
      configured: Boolean(
        process.env.NGN_GEMINI_KEY ||
          process.env.GEMINI_API_KEY ||
          process.env.API_KEY
      ),
    });
  });

  app.post('/api/chat', async (req, res) => {
    const body = req.body as { messages?: ChatInputMessage[] };
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (messages.length === 0) {
      res.status(400).json({ error: 'Se requiere al menos un mensaje.' });
      return;
    }

    const sanitizedMessages = messages
      .filter(
        (m) =>
          (m.role === 'user' || m.role === 'model') &&
          typeof m.text === 'string' &&
          m.text.trim().length > 0
      )
      .map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })) satisfies Content[];

    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      res.status(400).json({ error: 'El último mensaje debe ser del usuario.' });
      return;
    }

    const history = sanitizedMessages.slice(0, -1);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(': connected\n\n');

    let closed = false;
    const heartbeat = setInterval(() => {
      if (!closed && !res.writableEnded) {
        res.write(': ping\n\n');
      }
    }, 4000);

    res.on('close', () => {
      clearInterval(heartbeat);
      if (!res.writableEnded) {
        closed = true;
      }
    });

    try {
      const ai = createGenAIClient();
      const createAndStream = async () => {
        const chat = ai.chats.create({
          model: GEMINI_MODEL,
          history,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
          },
        });
        return chat.sendMessageStream({
          message: lastMessage.parts[0].text ?? '',
        });
      };

      let stream: Awaited<ReturnType<typeof createAndStream>> | null = null;
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (closed) break;
        try {
          stream = await createAndStream();
          break;
        } catch (retryErr) {
          const errMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          const isTransient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(errMsg);
          if (!isTransient || attempt === maxRetries || closed) {
            throw retryErr;
          }
          const delayMs = 800 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      if (stream) {
        for await (const chunk of stream) {
          if (closed) break;
          const textChunk = chunk.text ?? '';
          if (textChunk) {
            res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
          }
        }
      }

      clearInterval(heartbeat);
      if (!closed) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    } catch (err) {
      clearInterval(heartbeat);
      console.error('[NGN-Copiloto API Error]:', err);
      const message =
        err instanceof Error ? err.message : 'Error interno al consultar el modelo.';
      if (!closed && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
      }
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const result = await vite.transformRequest('/@vite/client');
        if (!result?.code) {
          next();
          return;
        }
        const safeCode = result.code.replace(
          'transport.connect(createHMRHandler(handleMessage));',
          '/* HMR WebSocket disabled */'
        );
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.send(safeCode);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`NGN-Copiloto NOC server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
