import { Router } from 'express';
import { parseIntent } from '@plc/ai';

export const parseIntentRouter = Router();

parseIntentRouter.post('/', (req, res) => {
  try {
    const prompt = req.body?.prompt || req.body?.input;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Field "prompt" or "input" is required as a string.' });
    }

    const intent = parseIntent(prompt);
    return res.json({ success: true, intent });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
