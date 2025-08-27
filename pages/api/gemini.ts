import type { NextApiRequest, NextApiResponse } from 'next';

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { intent, answers = {}, currentStep, action } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    if (action === 'generateQuestion') {
      const systemPrompt = `You are an expert prompt engineer helping users build comprehensive AI prompts. Based on the user's intent and previous answers, generate the next most relevant question that will improve the final prompt.

IMPORTANT: Respond with ONLY a valid JSON object in this exact format:
{
  "question": {
    "text": "Clear, specific question text",
    "type": "text|textarea|select",
    "options": ["option1", "option2", "option3"] (only if type is "select"),
    "required": true|false
  }
}

Guidelines:
- Ask questions that build upon previous answers
- Focus on specificity, context, audience, tone, format, constraints
- Avoid redundant questions
- Make questions actionable and clear
- For select type, provide 3-5 relevant options`;

      const previousAnswers = Object.entries(answers)
        .map(([q, a]) => `${q}: ${a}`)
        .join('\n');
      
      const userPrompt = `User Intent: "${intent}"
Current Step: ${currentStep + 1}/20
Previous Answers:
${previousAnswers}

Generate the next most relevant question to improve this AI prompt.`;

      const geminiRequest: GeminiRequest = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': process.env.GEMINI_API_KEY
          },
          body: JSON.stringify(geminiRequest)
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return res.json(result);
      } else {
        throw new Error('Invalid response format from Gemini');
      }
    }
    
    if (action === 'generateFinalPrompt') {
      const systemPrompt = `You are an expert prompt engineer. Create a comprehensive, well-structured AI prompt based on the user's intent and all their answers.

IMPORTANT: Respond with ONLY a valid JSON object in this exact format:
{
  "finalPrompt": "Complete, professional AI prompt ready to use"
}

Guidelines:
- Create a clear, actionable prompt that incorporates all context
- Structure the prompt logically with clear sections if needed
- Include specific requirements, constraints, and desired outcomes
- Make it professional and effective for AI systems
- Ensure the prompt is comprehensive but not overly verbose`;

      const answersText = Object.entries(answers)
        .map(([q, a]) => `${q}: ${a}`)
        .join('\n');
      
      const userPrompt = `Original Intent: "${intent}"

Detailed Requirements:
${answersText}

Create a comprehensive, structured AI prompt that incorporates all this information effectively.`;

      const geminiRequest: GeminiRequest = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1500,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': process.env.GEMINI_API_KEY
          },
          body: JSON.stringify(geminiRequest)
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return res.json(result);
      } else {
        throw new Error('Invalid response format from Gemini');
      }
    }

    return res.status(400).json({ error: 'Invalid action specified' });

  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}