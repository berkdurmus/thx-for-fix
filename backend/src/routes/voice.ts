import { Router, Request, Response } from 'express';
import {
  VoiceIntentProcessor,
  createProvider,
  type VoiceProcessRequest,
  type VoiceProcessResponse,
} from '@plsfix/ai-comments';

export const voiceRouter = Router();

/**
 * Process a voice/text command and return structured changes
 *
 * POST /api/voice/process
 *
 * Body: VoiceProcessRequest
 * Returns: VoiceProcessResponse
 */
voiceRouter.post('/process', async (req: Request, res: Response) => {
  console.log('=== Voice Process Request ===');
  console.log('Body:', JSON.stringify(req.body, null, 2));

  try {
    const request = req.body as VoiceProcessRequest;

    // Validate input
    if (!request.transcript || request.transcript.trim().length === 0) {
      return res.status(400).json({
        understood: false,
        interpretation: 'No command provided',
        changes: [],
        error: 'Transcript is required',
      } as VoiceProcessResponse);
    }

    // Check for API key
    const provider = process.env.LLM_PROVIDER || 'openai';
    const apiKey =
      provider === 'openai'
        ? process.env.OPENAI_API_KEY
        : process.env.ANTHROPIC_API_KEY;

    console.log(
      `Provider: ${provider}, API Key present: ${!!apiKey}, Key length: ${apiKey?.length || 0}`
    );

    if (!apiKey) {
      return res.status(500).json({
        understood: false,
        interpretation: 'AI service not configured',
        changes: [],
        error: `LLM API key not configured. Please set ${
          provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'
        } environment variable.`,
      } as VoiceProcessResponse);
    }

    // Create LLM provider
    const llmProvider = createProvider(provider as 'openai' | 'anthropic', {
      apiKey,
      model: process.env.AI_COMMENTS_MODEL,
    });

    // Create voice processor
    const processor = new VoiceIntentProcessor(llmProvider, {
      maxTokens: 1000,
      temperature: 0.3,
    });

    console.log('Processing voice command:', request.transcript);

    // Process the command
    const result = await processor.process(request);

    console.log('Voice processing result:', JSON.stringify(result, null, 2));

    return res.json(result);
  } catch (error) {
    console.error('Voice processing error:', error);
    return res.status(500).json({
      understood: false,
      interpretation: 'Failed to process command',
      changes: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    } as VoiceProcessResponse);
  }
});

/**
 * Health check for voice service
 *
 * GET /api/voice/health
 */
voiceRouter.get('/health', (req: Request, res: Response) => {
  const provider = process.env.LLM_PROVIDER || 'openai';
  const hasApiKey =
    provider === 'openai'
      ? !!process.env.OPENAI_API_KEY
      : !!process.env.ANTHROPIC_API_KEY;

  res.json({
    status: hasApiKey ? 'configured' : 'not_configured',
    provider,
    model: process.env.AI_COMMENTS_MODEL || 'default',
  });
});
