const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Used when no Hugging Face key is configured, or if the Hugging Face
// call fails or returns nothing usable - keeps the feature usable
// instead of just erroring out.
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
// description. This is a real AI feature used INSIDE the app (not just a
// tool used to write the code) - it saves the user from typing a
// description by hand. Small free-tier models are unreliable at
// producing valid JSON, so we only ask the model for plain text (the
// description) and generate the subtasks locally - this is much more
// robust than parsing JSON out of a small model's output.
//
// Requires HUGGINGFACE_API_KEY in backend/.env (free tier available at
// huggingface.co/settings/tokens). Without it, this route still responds
// with a locally-generated suggestion so the button never breaks the UI.
router.post('/suggest', async (req, res) => {
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'A task title is required to generate suggestions.' });
  }

  const fallback = generateLocalSuggestion(title);

  if (!process.env.HUGGINGFACE_API_KEY) {
    return res.json(fallback);
  }

  try {
    const model = process.env.HUGGINGFACE_MODEL || 'google/flan-t5-small';
    const prompt = `Write one short sentence (under 15 words) describing how to complete this task: "${title}"`;

    const hfResponse = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 40 },
      }),
    });

    if (!hfResponse.ok) {
      console.warn('Hugging Face API error:', hfResponse.status, await hfResponse.text());
      return res.json(fallback);
    }

    const hfData = await hfResponse.json();
    const rawText = Array.isArray(hfData)
      ? hfData[0]?.generated_text
      : hfData.generated_text;
    const description = (rawText || '').trim().replace(/^["']|["']$/g, '');

    if (!description) {
      console.warn('Hugging Face returned an empty response, using local fallback');
      return res.json(fallback);
    }

    // Description comes from the AI model; subtasks are generated locally
    // since small free models aren't reliable at multi-item structured output.
    return res.json({
      description,
      subtasks: fallback.subtasks,
    });
  } catch (err) {
    console.warn('Hugging Face request failed:', err.message);
    return res.json(fallback);
  }
});

module.exports = router;
