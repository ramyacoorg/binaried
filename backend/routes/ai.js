const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Simple local fallback generator used when external AI providers are
// unavailable. Produces a short description and three actionable subtasks.
function generateLocalSuggestion(title) {
  const safeTitle = (title || '').trim();
  const description = safeTitle ? `Do: ${safeTitle}`.substring(0, 200) : 'No title provided';
  const subtasks = [
    safeTitle ? `Clarify requirements for "${safeTitle}"` : 'Clarify requirements',
    safeTitle ? `Break "${safeTitle}" into smaller steps` : 'Break into smaller steps',
    safeTitle ? `Complete and verify "${safeTitle}"` : 'Complete and verify',
  ];
  return { description, subtasks };
}

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
      // If Anthropic is not configured but the developer provided a
      // Hugging Face token, use Hugging Face directly as a free/low-cost
      // fallback so the feature still works without Anthropic.
      if (process.env.HUGGINGFACE_API_KEY) {
        try {
          const hfModel = process.env.HUGGINGFACE_MODEL || 'google/flan-t5-small';
          const hfRes = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: `Task title: ${title}\n\nWrite a short (<=20 words) description and 3 short subtasks as JSON: {"description":"...","subtasks":["...","...","..."]}`,
              parameters: { max_new_tokens: 150 },
            }),
          });

          const hfJson = await hfRes.json();
          let text = '';
          if (Array.isArray(hfJson)) text = hfJson[0]?.generated_text || hfJson[0]?.text || '';
          else text = hfJson.generated_text || hfJson.text || '';

          try {
            const parsedHF = JSON.parse(text.trim());
            return res.json(parsedHF);
          } catch {
            return res.json({ description: text.trim().split('\n')[0] || '', subtasks: [] });
          }
        } catch (hfErr) {
          const info = hfErr && (hfErr.code || hfErr.message) ? (hfErr.code || hfErr.message) : 'unreachable';
          console.warn(`Hugging Face unreachable (${info}); returning local suggestion.`);
          return res.json(generateLocalSuggestion(title));
        }
      }

      // If no external provider is configured, fall back to a local
      // suggestion generator so the feature remains usable offline.
      return res.json(generateLocalSuggestion(title));
    }

    const prompt = `You are helping fill in details for a to-do task titled: "${title}".
Respond with ONLY valid JSON, no other text, in this exact shape:
{"description": "one short sentence describing the task", "subtasks": ["step 1", "step 2", "step 3"]}
Keep the description under 20 words and give 3-4 short, concrete subtasks.`;

    const model = process.env.ANTHROPIC_MODEL || 'claude-3.5';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens_to_sample: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch (_) {
        parsedErr = null;
      }

      console.error('Anthropic API error:', response.status, errText);

      // Detect common billing / insufficient credit message and return a
      // clearer status so the frontend can show actionable text to the user.
      const lower = (errText || '').toLowerCase();
      const isBilling =
        response.status === 400 &&
        (lower.includes('credit balance') || lower.includes('insufficient') || (parsedErr && parsedErr.error && /credit/i.test(parsedErr.error.message || '')));

      if (isBilling) {
        // Try a Hugging Face fallback if a token is configured.
        if (process.env.HUGGINGFACE_API_KEY) {
          try {
            const hfModel = process.env.HUGGINGFACE_MODEL || 'google/flan-t5-small';
            const hfRes = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: `Task title: ${title}\n\nWrite a short (<=20 words) description and 3 short subtasks as JSON: {"description":"...","subtasks":["...","...","..."]}`,
                parameters: { max_new_tokens: 150 },
              }),
            });

            const hfJson = await hfRes.json();
            let text = '';
            if (Array.isArray(hfJson)) text = hfJson[0]?.generated_text || hfJson[0]?.text || '';
            else text = hfJson.generated_text || hfJson.text || '';

            try {
              const parsedHF = JSON.parse(text.trim());
              return res.json(parsedHF);
            } catch {
              return res.json({ description: text.trim().split('\n')[0] || '', subtasks: [] });
            }
          } catch (hfErr) {
            const info = hfErr && (hfErr.code || hfErr.message) ? (hfErr.code || hfErr.message) : 'unreachable';
            console.warn(`Hugging Face fallback failed (${info}); returning local suggestion.`);
            return res.json(generateLocalSuggestion(title));
          }
        }

        return res.status(402).json({
          message:
            'AI provider billing issue: your Anthropic account has insufficient credits. Add credits in Anthropic Plans & Billing or disable AI suggestions.',
          error: parsedErr || errText,
        });
      }

      return res.status(502).json({ message: 'AI provider error.', error: parsedErr || errText });
    }

    const data = await response.json();
    const rawText =
      data.completion?.response ||
      data.completion ||
      data.output_text ||
      data.content?.[0]?.text ||
      data.message ||
      data.response ||
      '{}';

    let parsed;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      parsed = { description: rawText.trim(), subtasks: [] };
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ message: 'Could not generate AI suggestion.', error: err.message });
  }
});

module.exports = router;
