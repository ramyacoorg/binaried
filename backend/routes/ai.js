const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Used when no Hugging Face key is configured, or if the Hugging Face
// call fails for any reason - keeps the feature usable instead of
// just erroring out.
function generateLocalSuggestion(title) {
  const safeTitle = (title || '').trim();
  return {
    description: safeTitle ? `Complete: ${safeTitle}` : 'No title provided',
    subtasks: [
      `Clarify what "${safeTitle}" involves`,
      `Break "${safeTitle}" into smaller steps`,
      `Finish and double-check "${safeTitle}"`,
    ],
  };
}

// POST /api/ai/suggest
// Given just a task title, asks a Hugging Face model to generate a short
// description and a few subtasks. This is a real AI feature used INSIDE
// the app (not just a tool used to write the code) - it saves the user
// from typing the description by hand.
//
// Requires HUGGINGFACE_API_KEY in backend/.env (free tier available at
// huggingface.co/settings/tokens). Without it, this route still responds
// with a locally-generated suggestion so the button never breaks the UI.
router.post('/suggest', async (req, res) => {
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'A task title is required to generate suggestions.' });
  }

  if (!process.env.HUGGINGFACE_API_KEY) {
    return res.json(generateLocalSuggestion(title));
  }

  try {
    const model = process.env.HUGGINGFACE_MODEL || 'google/flan-t5-small';
    const prompt = `Task title: ${title}\n\nWrite a short (under 20 words) description and 3 short subtasks as JSON: {"description":"...","subtasks":["...","...","..."]}`;

    const hfResponse = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 150 },
      }),
    });

    if (!hfResponse.ok) {
      console.warn('Hugging Face API error:', hfResponse.status, await hfResponse.text());
      return res.json(generateLocalSuggestion(title));
    }

    const hfData = await hfResponse.json();
    const rawText = Array.isArray(hfData)
      ? hfData[0]?.generated_text || ''
      : hfData.generated_text || '';

    try {
      const parsed = JSON.parse(rawText.trim());
      return res.json(parsed);
    } catch {
      return res.json(generateLocalSuggestion(title));
    }
  } catch (err) {
    console.warn('Hugging Face request failed:', err.message);
    return res.json(generateLocalSuggestion(title));
  }
});

module.exports = router;
