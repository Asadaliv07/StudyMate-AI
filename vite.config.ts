import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleAiApiRequest } from './server/apiRouter.ts';

/**
 * Custom Vite plugin providing server-side API endpoints for StudyMate AI.
 * Routes /api/ai/* exclusively through server-side Node.js, ensuring
 * API keys and model prompts are never bundled or exposed to client browsers.
 */
function studyMateAiServerPlugin(): Plugin {
  return {
    name: 'studymate-ai-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await handleAiApiRequest(req, res);
          if (!handled) {
            next();
          }
        } catch (err) {
          next(err);
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await handleAiApiRequest(req, res);
          if (!handled) {
            next();
          }
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env into process.env for server middleware
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of Object.keys(env)) {
    if (!process.env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    plugins: [react(), studyMateAiServerPlugin()],
  };
});
