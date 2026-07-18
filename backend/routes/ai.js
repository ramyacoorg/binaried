const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

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

router.post('/suggest', async (req, res) => {
  console.log('=== AI SUGGEST ROUTE HIT ===');
  const { title } = req.body;
  console.log('Title received:', title);

  if (!title || !title.trim()) {
    console.log('No title provided, returning 400');
    return res.status(400).json({ message: 'A task title is required to generate suggestions.' });
  }

  const fallback = generateLocalSuggestion(title);

  console.log('HUGGINGFACE_API_KEY present?', !!process.env.HUGGINGFACE_API_KEY);
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.log('No API key found in this request context, using local fallback');
    return res.json(fallback);
  }

  try {
    const model = process.env.HUGGINGFACE_MODEL || 'google/flan-t5-small';
    const prompt = `Write one short sentence (under 15 words) describing how to complete this task: "${title}"`;
    console.log('Calling Hugging Face model:', model);

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

    console.log('Hugging Face response status:', hfResponse.status);

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.warn('Hugging Face API error:', hfResponse.status, errText);
      return res.json(fallback);
    }

    const hfData = await hfResponse.json();
    console.log('Hugging Face raw response:', JSON.stringify(hfData));

    const rawText = Array.isArray(hfData)
      ? hfData[0]?.generated_text
      : hfData.generated_text;
    const description = (rawText || '').trim().replace(/^["']|["']$/g, '');

    if (!description) {
      console.warn('Hugging Face returned an empty response, using local fallback');
      return res.json(fallback);
    }

    console.log('Using AI-generated description:', description);
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
