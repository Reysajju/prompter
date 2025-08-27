import { useState, useEffect } from 'react'
import { saveSession, loadSession } from '../lib/storage'
import { callGeminiAPI } from '../lib/gemini-client'

interface Question {
  id: string
  text: string
  type: 'text' | 'select' | 'textarea'
  options?: string[]
  required: boolean
}

export default function Home() {
  const [intent, setIntent] = useState('')
  const [hasStarted, setHasStarted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [finalPrompt, setFinalPrompt] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  const maxQuestions = 15

  useEffect(() => {
    const saved = loadSession('prompt-builder')
    if (saved) {
      setIntent(saved.intent || '')
      setHasStarted(saved.hasStarted || false)
      setCurrentStep(saved.currentStep || 0)
      setQuestions(saved.questions || [])
      setAnswers(saved.answers || {})
      setFinalPrompt(saved.finalPrompt || '')
      setIsComplete(saved.isComplete || false)
      setProgress(saved.progress || 0)
    }
  }, [])

  useEffect(() => {
    saveSession('prompt-builder', { 
      intent, hasStarted, currentStep, questions, answers, finalPrompt, isComplete, progress 
    })
  }, [intent, hasStarted, currentStep, questions, answers, finalPrompt, isComplete, progress])

  const startBuilding = () => {
    setHasStarted(true)
    setError('')
    generateNextQuestion()
  }

  const generateNextQuestion = async () => {
    if (currentStep >= maxQuestions) {
      generateFinalPrompt()
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const systemPrompt = `You are an elite prompt engineering specialist with deep expertise across all domains. Your mission is to craft sophisticated, domain-specific questions that will elevate the user's prompt to professional standards.

CRITICAL REQUIREMENTS:
1. Generate questions that are HIGHLY SPECIFIC to the user's domain and intent
2. Each question must be COMPETITIVE-GRADE - the kind that separates amateur from professional prompts
3. Focus on advanced, nuanced aspects that most people overlook
4. Questions should reveal deep understanding of the subject matter
5. Prioritize questions that will make the final prompt significantly more effective

RESPONSE FORMAT - ONLY valid JSON:
{
  "question": {
    "text": "Sophisticated, domain-specific question that demonstrates expertise",
    "type": "text|textarea|select",
    "options": ["expert-level option 1", "advanced option 2", "professional option 3"] (only for select type),
    "required": true|false,
    "rationale": "Brief explanation of why this question is crucial for prompt quality"
  }
}

QUESTION CATEGORIES TO PRIORITIZE:
- Domain-specific terminology and jargon
- Professional standards and best practices
- Advanced constraints and requirements
- Sophisticated audience considerations
- Technical specifications and parameters
- Industry-specific formats and structures
- Expert-level quality criteria
- Advanced contextual factors

Make each question feel like it came from a seasoned professional in that specific field.`;

      const previousAnswers = Object.entries(answers)
        .map(([q, a]) => `${q}: ${a}`)
        .join('\n');
      
      const userPrompt = `DOMAIN ANALYSIS: "${intent}"
EXPERTISE LEVEL: Professional/Expert
CURRENT REFINEMENT STAGE: ${currentStep + 1}/15
CONTEXT BUILT SO FAR:
${previousAnswers}

TASK: Generate the next SOPHISTICATED, DOMAIN-SPECIFIC question that will significantly enhance prompt quality. This question should demonstrate deep expertise in the relevant field and focus on advanced aspects that amateur prompt builders typically miss.

Consider:
- What would a domain expert ask that others wouldn't?
- What nuanced details separate good from exceptional results?
- What professional standards or constraints apply?
- What advanced techniques or methodologies are relevant?
- What sophisticated audience considerations matter?

Generate a question that elevates this prompt to professional/expert level.`;

      const response = await callGeminiAPI(`${systemPrompt}\n\n${userPrompt}`);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const question: Question = {
          id: `q${currentStep}`,
          ...data.question
        }
        
        setQuestions(prev => [...prev, question])
        setProgress(Math.min(((currentStep + 1) / maxQuestions) * 80, 80))
      } else {
        throw new Error('Invalid response format from Gemini');
      }
    } catch (error) {
      console.error('Error generating question:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate question')
    }
    
    setIsLoading(false)
  }

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const nextQuestion = () => {
    setCurrentStep(prev => prev + 1)
    generateNextQuestion()
  }

  const skipToEnd = () => {
    generateFinalPrompt()
  }

  const generateFinalPrompt = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const systemPrompt = `You are a master prompt architect with expertise across all professional domains. Your task is to synthesize all gathered information into a sophisticated, production-ready AI prompt that demonstrates expert-level understanding.

RESPONSE FORMAT - ONLY valid JSON:
{
  "finalPrompt": "Expertly crafted, comprehensive AI prompt",
  "promptStructure": {
    "role": "Specific expert role definition",
    "context": "Detailed situational context",
    "requirements": "Precise specifications and constraints",
    "format": "Expected output structure",
    "quality": "Professional standards and criteria"
  },
  "expertiseLevel": "Professional/Expert/Specialist"
}

PROMPT CRAFTING PRINCIPLES:
1. ROLE DEFINITION: Establish clear expert persona with relevant credentials
2. CONTEXT SETTING: Provide comprehensive background and situational awareness
3. SPECIFIC REQUIREMENTS: Detail exact specifications, constraints, and parameters
4. OUTPUT FORMAT: Define precise structure, style, and presentation requirements
5. QUALITY STANDARDS: Set professional benchmarks and success criteria
6. DOMAIN EXPERTISE: Incorporate field-specific terminology and best practices

Create a prompt that would impress industry professionals and deliver exceptional results.`;

      const answersText = Object.entries(answers)
        .map(([q, a]) => `${q}: ${a}`)
        .join('\n');
      
      const userPrompt = `EXPERT PROMPT SYNTHESIS REQUEST

PRIMARY OBJECTIVE: "${intent}"

COMPREHENSIVE REQUIREMENTS ANALYSIS:
${answersText}

SYNTHESIS TASK:
Transform this information into a masterfully crafted AI prompt that:
- Demonstrates deep domain expertise
- Incorporates professional standards and best practices
- Includes sophisticated constraints and specifications
- Defines clear quality benchmarks
- Uses appropriate technical terminology
- Structures information for optimal AI comprehension
- Delivers results that would satisfy industry experts

Create a prompt that represents the pinnacle of professional prompt engineering in this domain.`;

      const response = await callGeminiAPI(`${systemPrompt}\n\n${userPrompt}`);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        setFinalPrompt(data.finalPrompt)
        // Store additional metadata if provided
        if (data.promptStructure) {
          console.log('Prompt Structure:', data.promptStructure);
        }
        setIsComplete(true)
        setProgress(100)
      } else {
        throw new Error('Invalid response format from Gemini');
      }
    } catch (error) {
      console.error('Error generating final prompt:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate final prompt')
    }
    
    setIsLoading(false)
  }

  const startOver = () => {
    setIntent('')
    setHasStarted(false)
    setCurrentStep(0)
    setQuestions([])
    setAnswers({})
    setFinalPrompt('')
    setIsComplete(false)
    setProgress(0)
    setError('')
    setCopySuccess(false)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(finalPrompt)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const currentQuestion = questions[currentStep]
  const canProceed = currentQuestion && (answers[currentQuestion.id] || !currentQuestion.required)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              ✨ AI Prompt Builder
            </h1>
            {hasStarted && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-white/80">
                  Step {currentStep + 1} of {maxQuestions}
                </span>
                <button 
                  onClick={startOver} 
                  className="text-sm text-purple-300 hover:text-white transition-colors duration-200 px-3 py-1 rounded-md hover:bg-white/10"
                >
                  Start Over
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        {hasStarted && (
          <div className="mb-8 animate-fade-in">
            <div className="flex justify-between text-sm text-white/80 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
              <div 
                className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 h-3 rounded-full transition-all duration-1000 ease-out shadow-lg"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-4 animate-slide-up">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-200">{error}</span>
            </div>
          </div>
        )}

        {/* Initial Intent */}
        {!hasStarted && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 mb-6 border border-white/20 animate-slide-up">
            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent text-center">
              What do you want to achieve?
            </h2>
            <p className="text-white/70 text-center mb-8 text-lg">
              Describe your goal and I'll help you build the perfect AI prompt
            </p>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full p-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl focus:border-purple-400 focus:outline-none transition-all duration-300 text-white placeholder-white/60 resize-none"
              rows={4}
              placeholder="Example: Write a blog post about sustainable technology for business leaders..."
            />
            <div className="mt-4 text-sm text-white/60">
              <p className="mb-2">💡 <strong>Tips for better results:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Be specific about your content type (blog post, email, code, etc.)</li>
                <li>Mention your target audience if relevant</li>
                <li>Include any specific requirements or constraints</li>
              </ul>
            </div>
            <button
              onClick={startBuilding}
              disabled={!intent.trim() || isLoading}
              className="mt-6 w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Starting...
                </div>
              ) : (
                '✨ Start Building Prompt'
              )}
            </button>
          </div>
        )}

        {/* Current Question */}
        {hasStarted && currentQuestion && !isComplete && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 mb-6 border border-white/20 animate-slide-up">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-2">{currentQuestion.text}</h2>
                <div className="flex items-center space-x-3">
                  {!currentQuestion.required && (
                    <span className="text-sm text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full backdrop-blur-sm">
                      Optional
                    </span>
                  )}
                  <span className="text-sm text-white/60">
                    Question {currentStep + 1} of {maxQuestions}
                  </span>
                </div>
              </div>
            </div>
            
            {currentQuestion.type === 'textarea' && (
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                className="w-full p-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl focus:border-purple-400 focus:outline-none transition-all duration-300 text-white placeholder-white/60 resize-none"
                rows={4}
                placeholder="Your answer..."
              />
            )}
            
            {currentQuestion.type === 'text' && (
              <input
                type="text"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                className="w-full p-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl focus:border-purple-400 focus:outline-none transition-all duration-300 text-white placeholder-white/60"
                placeholder="Your answer..."
              />
            )}
            
            {currentQuestion.type === 'select' && (
              <select
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                className="w-full p-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl focus:border-purple-400 focus:outline-none transition-all duration-300 text-white"
              >
                <option value="" className="bg-slate-800 text-white">Select an option...</option>
                {currentQuestion.options?.map(option => (
                  <option key={option} value={option} className="bg-slate-800 text-white">{option}</option>
                ))}
              </select>
            )}
            
            <div className="flex justify-between mt-8 space-x-4">
              <button
                onClick={skipToEnd}
                disabled={isLoading}
                className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all duration-300 border border-white/30 disabled:opacity-50"
              >
                Skip to Final Prompt
              </button>
              <button
                onClick={nextQuestion}
                disabled={!canProceed || isLoading}
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white px-8 py-3 rounded-xl hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : currentStep >= maxQuestions - 1 ? 'Generate Final Prompt' : 'Next Question'}
              </button>
            </div>
          </div>
        )}

        {/* Final Prompt */}
        {isComplete && finalPrompt && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                🎉 Your AI Prompt is Ready!
              </h2>
              <div className="flex items-center text-green-400">
                <svg className="w-6 h-6 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Complete
              </div>
            </div>
            
            <div className="bg-black/30 backdrop-blur-sm border-2 border-white/20 rounded-xl p-6 mb-6 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <h3 className="text-lg font-semibold text-purple-200">Professional AI Prompt</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-300 font-medium">Expert Level</span>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none">
                  <div className="text-white/95 leading-relaxed whitespace-pre-wrap font-mono text-sm bg-black/20 rounded-lg p-4 border border-white/10">
                    {finalPrompt}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/10">
                  <span>Generated with advanced prompt engineering</span>
                  <span>{finalPrompt.length} characters</span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={copyToClipboard}
                className="flex-1 bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:via-emerald-700 hover:to-green-800 transition-all duration-300 font-semibold flex items-center justify-center shadow-lg hover:shadow-green-500/25 transform hover:scale-105"
              >
                {copySuccess ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Prompt
                  </>
                )}
              </button>
              <button
                onClick={startOver}
                className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-xl hover:bg-white/30 transition-all duration-300 font-semibold border border-white/30"
              >
                Create New Prompt
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && hasStarted && !isComplete && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 animate-slide-up">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mr-4"></div>
              <span className="text-white text-lg">Generating your next question...</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
      `}</style>
    </div>
  )
}