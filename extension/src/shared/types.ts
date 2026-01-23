// Element types
export interface ElementInfo {
  id: string;
  tagName: string;
  xpath: string;
  selector: string;
  textContent: string;
  computedStyles: ComputedStyleInfo;
  boundingRect: DOMRect;
}

export interface ComputedStyleInfo {
  fontFamily: string;
  fontWeight: string;
  fontSize: string;
  color: string;
  backgroundColor: string;
  textAlign: string;
  fontStyle: string;
  textDecoration: string;
  width: string;
  height: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
}

// Change types
export type ChangeType = 'text' | 'style';

export interface Change {
  id: string;
  type: ChangeType;
  elementId: string;
  elementTag: string;
  xpath: string;
  selector: string;
  timestamp: number;
  original: {
    textContent?: string;
    styles?: Partial<ComputedStyleInfo>;
  };
  modified: {
    textContent?: string;
    styles?: Partial<ComputedStyleInfo>;
  };
}

// GitHub/PR types
export interface Repository {
  id: number;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export interface Branch {
  name: string;
  commit: string;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  status: 'creating' | 'processing' | 'analyzing' | 'open' | 'closed' | 'merged';
  createdAt: number;
  repo: string;
  branch: string;
  websiteUrl: string;
  changesCount: number;
}

// Message types for communication between content script, background, and sidepanel
export type MessageType =
  | 'ELEMENT_SELECTED'
  | 'ELEMENT_HOVERED'
  | 'ELEMENT_DESELECTED'
  | 'CHANGE_RECORDED'
  | 'APPLY_STYLE'
  | 'APPLY_TEXT'
  | 'REVERT_CHANGE'
  | 'GET_CHANGES'
  | 'TOGGLE_EDIT_MODE'
  | 'SIDEPANEL_READY'
  | 'VOICE_COMMAND_START'
  | 'VOICE_COMMAND_RESULT'
  | 'GET_DOM_CONTEXT'
  | 'DOM_CONTEXT_RESPONSE'
  | 'OPEN_VOICE_INPUT'
  | 'VOICE_TRANSCRIPT'
  | 'VOICE_PROCESSING_RESULT'
  | 'VOICE_PROCESSING_ERROR';

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface ElementSelectedPayload {
  element: ElementInfo;
}

export interface ApplyStylePayload {
  elementId: string;
  styles: Partial<ComputedStyleInfo>;
}

export interface ApplyTextPayload {
  elementId: string;
  text: string;
}

// UI State types
export type TabType = 'design' | 'changes' | 'pullRequests' | 'aiComments' | 'voice';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  accessToken: string;
}

// Voice mode types
export type VoiceModeStatus = 'idle' | 'recording' | 'processing' | 'applying' | 'complete' | 'error';

export interface VoiceChange {
  type: 'style' | 'text';
  elementId?: string;
  elementSelector?: string;
  elementDescription?: string;
  styles?: Record<string, string>;
  text?: string;
}

export interface VoiceCommandResult {
  understood: boolean;
  interpretation: string;
  changes: VoiceChange[];
  clarificationNeeded?: string;
  suggestions?: string[];
  error?: string;
}

export interface VoiceCommandPayload {
  transcript: string;
  changes: VoiceChange[];
}

export interface VoiceCommandHistoryItem {
  id: string;
  transcript: string;
  interpretation: string;
  changes: VoiceChange[];
  timestamp: number;
  success: boolean;
}

export interface ElementSummary {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  isInteractive: boolean;
}

export interface DOMContextPayload {
  url: string;
  title: string;
  selectedElement?: ElementInfo;
  visibleElements: ElementSummary[];
}

export interface VoiceProcessRequest {
  transcript: string;
  selectedElement?: ElementInfo;
  pageContext: {
    url: string;
    title: string;
    visibleElements: ElementSummary[];
  };
}

// Voice overlay message payloads (for content script <-> sidepanel communication)
export interface VoiceTranscriptPayload {
  transcript: string;
  selectedElement?: ElementInfo;
  pageUrl: string;
  pageTitle: string;
}

export interface VoiceProcessingResultPayload {
  success: boolean;
  interpretation?: string;
  changes?: VoiceChange[];
  error?: string;
}
