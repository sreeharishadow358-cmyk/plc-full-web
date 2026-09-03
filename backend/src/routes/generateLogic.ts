import { Router } from 'express';
import { parseIntent, generateLogic, ParsedIntent } from '@plc/ai';

export const generateLogicRouter = Router();

generateLogicRouter.post('/', (req, res) => {
  try {
    const body = req.body || {};
    let intent: ParsedIntent;

    if (body.intent && typeof body.intent === 'object' && body.intent.type) {
      // Structured intent object directly provided
      intent = body.intent;
    } else if (body.input || body.prompt) {
      // Raw NL prompt provided — parse intent first, then generate logic
      const promptString = String(body.input || body.prompt);
      intent = parseIntent(promptString);
    } else {
      return res.status(400).json({ error: 'Request body must contain "input", "prompt", or "intent".' });
    }

    const result = generateLogic(intent);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
