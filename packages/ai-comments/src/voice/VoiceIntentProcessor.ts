/**
 * VoiceIntentProcessor - Processes natural language commands into DOM changes
 */

import type { LLMProvider } from '../providers/base';
import { VOICE_SYSTEM_PROMPT, buildVoicePrompt } from './prompts';
import type {
  VoiceProcessRequest,
  VoiceProcessResponse,
  VoiceChange,
  VoiceIntentProcessorConfig,
} from './types';

/**
 * Processes voice/text commands into structured DOM changes
 */
export class VoiceIntentProcessor {
  private provider: LLMProvider;
  private maxTokens: number;
  private temperature: number;

  constructor(provider: LLMProvider, config: VoiceIntentProcessorConfig = {}) {
    this.provider = provider;
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature ?? 0.3;
  }

  /**
   * Process a voice/text command and return structured changes
   */
  async process(request: VoiceProcessRequest): Promise<VoiceProcessResponse> {
    const { transcript, selectedElement, pageContext } = request;

    // Validate input
    if (!transcript || transcript.trim().length === 0) {
      return {
        understood: false,
        interpretation: 'No command provided',
        changes: [],
        error: 'Please provide a command to process',
      };
    }

    // Build the prompt
    const userPrompt = buildVoicePrompt(
      transcript,
      selectedElement ? {
        tagName: selectedElement.tagName,
        textContent: selectedElement.textContent,
        computedStyles: selectedElement.computedStyles as Record<string, string>,
      } : undefined,
      pageContext
    );

    try {
      // Call LLM
      const response = await this.provider.complete({
        messages: [
          { role: 'system', content: VOICE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: this.maxTokens,
        temperature: this.temperature,
        jsonMode: true,
      });

      // Parse response
      const result = this.parseResponse(response.content, selectedElement?.id);
      return result;

    } catch (error) {
      console.error('Voice intent processing error:', error);
      return {
        understood: false,
        interpretation: 'Failed to process the command',
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Parse the LLM response into a VoiceProcessResponse
   */
  private parseResponse(content: string, elementId?: string): VoiceProcessResponse {
    try {
      const parsed = JSON.parse(content);

      // Validate and normalize the response
      const response: VoiceProcessResponse = {
        understood: Boolean(parsed.understood),
        interpretation: String(parsed.interpretation || 'Unable to interpret the command'),
        changes: [],
        clarificationNeeded: parsed.clarificationNeeded || undefined,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : undefined,
      };

      // Process changes
      if (Array.isArray(parsed.changes)) {
        for (const change of parsed.changes) {
          const normalizedChange = this.normalizeChange(change, elementId);
          if (normalizedChange) {
            response.changes.push(normalizedChange);
          }
        }
      }

      return response;

    } catch (error) {
      console.error('Failed to parse LLM response:', error, content);
      return {
        understood: false,
        interpretation: 'Failed to parse the response',
        changes: [],
        error: 'Invalid response format from AI',
      };
    }
  }

  /**
   * Normalize a single change object
   */
  private normalizeChange(change: unknown, defaultElementId?: string): VoiceChange | null {
    if (!change || typeof change !== 'object') {
      return null;
    }

    const c = change as Record<string, unknown>;
    const type = c.type as string;

    if (type !== 'style' && type !== 'text') {
      return null;
    }

    const normalized: VoiceChange = {
      type: type as 'style' | 'text',
      elementId: (c.elementId as string) || defaultElementId,
      elementSelector: c.elementSelector as string | undefined,
      elementDescription: c.elementDescription as string | undefined,
    };

    if (type === 'style' && c.styles && typeof c.styles === 'object') {
      normalized.styles = this.normalizeStyles(c.styles as Record<string, unknown>);
    }

    if (type === 'text' && typeof c.text === 'string') {
      normalized.text = c.text;
    }

    // Validate that the change has actual content
    if (type === 'style' && (!normalized.styles || Object.keys(normalized.styles).length === 0)) {
      return null;
    }

    if (type === 'text' && !normalized.text) {
      return null;
    }

    return normalized;
  }

  /**
   * Normalize style properties to valid CSS values
   */
  private normalizeStyles(styles: Record<string, unknown>): Record<string, string> {
    const normalized: Record<string, string> = {};

    const validProperties = [
      'color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily',
      'fontStyle', 'textAlign', 'textDecoration', 'lineHeight', 'letterSpacing',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'border', 'borderRadius', 'borderColor', 'borderWidth', 'borderStyle',
      'display', 'visibility', 'opacity', 'overflow',
      'position', 'top', 'right', 'bottom', 'left', 'zIndex',
      'flexDirection', 'justifyContent', 'alignItems', 'gap',
      'boxShadow', 'textShadow', 'transform',
    ];

    for (const [key, value] of Object.entries(styles)) {
      // Only include valid CSS properties
      if (!validProperties.includes(key)) {
        continue;
      }

      // Convert value to string and validate
      const stringValue = String(value);
      
      // Basic validation - skip empty values
      if (!stringValue || stringValue === 'null' || stringValue === 'undefined') {
        continue;
      }

      // Normalize common color names to hex
      const normalizedValue = this.normalizeColorValue(key, stringValue);
      normalized[key] = normalizedValue;
    }

    return normalized;
  }

  /**
   * Normalize color values
   */
  private normalizeColorValue(property: string, value: string): string {
    // Only process color-related properties
    if (!['color', 'backgroundColor', 'borderColor'].includes(property)) {
      return value;
    }

    // Map common color names to Tailwind-like values
    const colorMap: Record<string, string> = {
      'red': '#EF4444',
      'blue': '#3B82F6',
      'green': '#10B981',
      'yellow': '#F59E0B',
      'orange': '#F97316',
      'purple': '#8B5CF6',
      'pink': '#EC4899',
      'gray': '#6B7280',
      'grey': '#6B7280',
      'black': '#000000',
      'white': '#FFFFFF',
      'teal': '#14B8A6',
      'cyan': '#06B6D4',
      'indigo': '#6366F1',
      'lime': '#84CC16',
      'amber': '#F59E0B',
      'emerald': '#10B981',
      'sky': '#0EA5E9',
      'violet': '#8B5CF6',
      'rose': '#F43F5E',
      'slate': '#64748B',
      'zinc': '#71717A',
      'neutral': '#737373',
      'stone': '#78716C',
    };

    const lowerValue = value.toLowerCase().trim();
    if (colorMap[lowerValue]) {
      return colorMap[lowerValue];
    }

    return value;
  }
}
