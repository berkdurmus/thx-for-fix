/**
 * Types for voice intent processing
 */

export interface ElementInfo {
  id: string;
  tagName: string;
  xpath?: string;
  selector?: string;
  textContent?: string;
  computedStyles?: {
    fontFamily?: string;
    fontWeight?: string;
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
    fontStyle?: string;
    textDecoration?: string;
    width?: string;
    height?: string;
    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    marginTop?: string;
    marginRight?: string;
    marginBottom?: string;
    marginLeft?: string;
  };
}

export interface ElementSummary {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  isInteractive: boolean;
}

export interface VoiceProcessRequest {
  /** The user's voice transcript */
  transcript: string;
  
  /** Currently selected element (if any) */
  selectedElement?: ElementInfo;
  
  /** Page context */
  pageContext: {
    url: string;
    title: string;
    visibleElements?: ElementSummary[];
  };
}

export interface VoiceChange {
  /** Type of change */
  type: 'style' | 'text';
  
  /** Element ID to target (if known) */
  elementId?: string;
  
  /** CSS selector to find element */
  elementSelector?: string;
  
  /** Description of element for user feedback */
  elementDescription?: string;
  
  /** Style changes (for type: 'style') */
  styles?: Record<string, string>;
  
  /** New text content (for type: 'text') */
  text?: string;
}

export interface VoiceProcessResponse {
  /** Whether the intent was understood */
  understood: boolean;
  
  /** Human-readable interpretation of what the user wants */
  interpretation: string;
  
  /** List of changes to apply */
  changes: VoiceChange[];
  
  /** If intent is unclear, what clarification is needed */
  clarificationNeeded?: string;
  
  /** Suggested alternatives if clarification is needed */
  suggestions?: string[];
  
  /** Error message if processing failed */
  error?: string;
}

export interface VoiceIntentProcessorConfig {
  /** Maximum tokens for LLM response */
  maxTokens?: number;
  
  /** Temperature for LLM (0-1) */
  temperature?: number;
}
