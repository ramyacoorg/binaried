const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// POST /api/ai/suggest
// Given just a task title, asks Claude to write a short description and a
// few actionable sub-steps. This is a real AI feature used INSIDE the app
// (not just a tool used to write the code) - it helps the user quickly
// flesh out a task instead of typing the description by hand.
//
// Requires ANTHROPIC_API_KEY to be set in backend/.env. If it isn't set,
// this route responds with a clear 501 so the rest of the app still works
// without a key.
router.post('/suggest', async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'A task title is required to generate suggestions.' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(501).json({
        message:
          'AI suggestions are not configured. Add ANTHROPIC_API_KEY to backend/.env to enable this feature.',
      });
    }

    const prompt = `You are helping fill in details for a to-do task titled: "${title}".
Respond with ONLY valid JSON, no other text, in this exact shape:
{"description": "one short sentence describing the task", "subtasks": ["step 1", "step 2", "step 3"]}
Keep the description under 20 words and give 3-4 short, concrete subtasks.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ message: 'AI provider error.', error: errText });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '{}';

    let parsed;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      // fall back gracefully if Claude didn't return clean JSON
      parsed = { description: rawText.trim(), subtasks: [] };
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ message: 'Could not generate AI suggestion.', error: err.message });
  }
});

module.exports = router;
