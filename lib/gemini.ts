interface GeminiResponse {
  is_complete: boolean;
  fields?: Array<{
    id: string;
    label: string;
    type: 'dropdown' | 'text' | 'textarea' | 'checkbox';
    options?: string[];
    required: boolean;
    default?: string;
    help?: string;
  }>;
  prompt_preview?: string;
  reason?: string;
}

export async function callGemini(context: any): Promise<GeminiResponse> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context)
  });
  
  if (!response.ok) {
    throw new Error('API request failed');
  }
  
  return response.json();
}

function generateInitialFields(intent: string): GeminiResponse {
  const lowerIntent = intent.toLowerCase();
  
  if (lowerIntent.includes('email')) {
    return {
      is_complete: false,
      fields: [
        {
          id: 'audience',
          label: 'Target Audience',
          type: 'dropdown',
          options: ['hiring manager', 'client', 'colleague', 'customer'],
          required: true,
          help: 'Who will receive this email?'
        },
        {
          id: 'tone',
          label: 'Tone',
          type: 'dropdown',
          options: ['professional', 'casual', 'friendly', 'formal'],
          required: true,
          default: 'professional'
        }
      ],
      reason: 'Need audience and tone for email generation'
    };
  }
  
  if (lowerIntent.includes('blog') || lowerIntent.includes('article')) {
    return {
      is_complete: false,
      fields: [
        {
          id: 'length',
          label: 'Word Count',
          type: 'dropdown',
          options: ['300-500', '500-800', '800-1200', '1200+'],
          required: true,
          default: '500-800'
        },
        {
          id: 'audience',
          label: 'Target Audience',
          type: 'text',
          required: true,
          help: 'Who is your target reader?'
        }
      ],
      reason: 'Need length and audience for blog post'
    };
  }
  
  return {
    is_complete: false,
    fields: [
      {
        id: 'tone',
        label: 'Tone',
        type: 'dropdown',
        options: ['professional', 'casual', 'creative', 'technical'],
        required: true,
        default: 'professional'
      },
      {
        id: 'length',
        label: 'Length',
        type: 'dropdown',
        options: ['short', 'medium', 'long', 'detailed'],
        required: true,
        default: 'medium'
      }
    ],
    reason: 'Need basic parameters for content generation'
  };
}

function evaluateCompletion(intent: string, values: Record<string, string>): GeminiResponse {
  const fieldCount = Object.keys(values).length;
  
  if (fieldCount >= 2) {
    const prompt = buildFinalPrompt(intent, values);
    return {
      is_complete: true,
      prompt_preview: prompt
    };
  }
  
  return {
    is_complete: false,
    fields: [{
      id: 'style',
      label: 'Writing Style',
      type: 'dropdown',
      options: ['conversational', 'academic', 'persuasive', 'informative'],
      required: false,
      default: 'conversational'
    }],
    reason: 'Adding style preference for better output'
  };
}

function buildFinalPrompt(intent: string, values: Record<string, string>): string {
  let prompt = intent;
  
  Object.entries(values).forEach(([key, value]) => {
    if (value) {
      prompt += ` ${key}: ${value}.`;
    }
  });
  
  return prompt + ' Please provide a comprehensive and well-structured response.';
}