import express from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

const PromptRequest = z.object({ goals: z.array(z.string()).default([]), blockers: z.array(z.string()).default([]) });

app.post('/generate', (req, res) => {
  const parsed = PromptRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const { goals, blockers } = parsed.data;
  const date = new Date().toLocaleDateString();
  const goalsPart = goals.length ? `Your goals: ${goals.join('; ')}. ` : '';
  const blockersPart = blockers.length ? `Watch for blockers: ${blockers.join('; ')}. ` : '';
  const prompt = `Today (${date}), remember: ${goalsPart}${blockersPart}Take one small action now.`;
  res.json({ prompt });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});

