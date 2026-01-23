/**
 * Voice Overlay UI for Content Script
 * 
 * A floating modal that appears on the page for voice input.
 * Runs in the webpage context where Web Speech API works.
 */

import { createSpeechRecognition, ContentSpeechRecognition } from './speechRecognition';

export type VoiceOverlayState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export interface VoiceOverlayCallbacks {
  onSubmit: (transcript: string) => void;
  onCancel: () => void;
}

export interface VoiceOverlay {
  show: () => void;
  hide: () => void;
  setState: (state: VoiceOverlayState, message?: string) => void;
  destroy: () => void;
}

// CSS styles as a string
const overlayStyles = `
  #plsfix-voice-overlay-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2147483647;
    display: none;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  }

  #plsfix-voice-overlay-backdrop.visible {
    display: flex;
  }

  #plsfix-voice-modal {
    background: white;
    border-radius: 16px;
    padding: 32px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    text-align: center;
    animation: plsfix-modal-appear 0.2s ease-out;
    pointer-events: auto;
  }

  @keyframes plsfix-modal-appear {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  #plsfix-voice-mic-btn {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: none;
    background: #F3F4F6;
    color: #6B7280;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    transition: all 0.2s ease;
  }

  #plsfix-voice-mic-btn:hover {
    background: #E5E7EB;
  }

  #plsfix-voice-mic-btn.recording {
    background: #EF4444;
    color: white;
    animation: plsfix-pulse 1.5s infinite;
  }

  #plsfix-voice-mic-btn.processing {
    background: #F59E0B;
    color: white;
    cursor: wait;
  }

  #plsfix-voice-mic-btn.success {
    background: #10B981;
    color: white;
  }

  #plsfix-voice-mic-btn.error {
    background: #EF4444;
    color: white;
  }

  @keyframes plsfix-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    70% {
      box-shadow: 0 0 0 15px rgba(239, 68, 68, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }

  @keyframes plsfix-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  #plsfix-voice-status {
    font-size: 14px;
    color: #6B7280;
    margin-bottom: 16px;
    min-height: 20px;
  }

  #plsfix-voice-status.recording {
    color: #EF4444;
  }

  #plsfix-voice-status.processing {
    color: #F59E0B;
  }

  #plsfix-voice-status.success {
    color: #10B981;
  }

  #plsfix-voice-status.error {
    color: #EF4444;
  }

  #plsfix-voice-transcript-container {
    background: #F9FAFB;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 16px;
    min-height: 60px;
    margin-bottom: 20px;
    text-align: left;
  }

  #plsfix-voice-transcript {
    font-size: 15px;
    color: #111827;
    line-height: 1.5;
    min-height: 24px;
  }

  #plsfix-voice-transcript.placeholder {
    color: #9CA3AF;
    font-style: italic;
  }

  #plsfix-voice-transcript .interim {
    color: #9CA3AF;
  }

  #plsfix-voice-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .plsfix-voice-btn {
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
  }

  .plsfix-voice-btn-secondary {
    background: #F3F4F6;
    color: #374151;
  }

  .plsfix-voice-btn-secondary:hover {
    background: #E5E7EB;
  }

  .plsfix-voice-btn-primary {
    background: #10B981;
    color: white;
  }

  .plsfix-voice-btn-primary:hover:not(:disabled) {
    background: #059669;
  }

  .plsfix-voice-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  #plsfix-voice-modal * {
    pointer-events: auto;
  }

  #plsfix-voice-hint {
    margin-top: 16px;
    font-size: 12px;
    color: #9CA3AF;
  }

  #plsfix-voice-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: plsfix-spin 0.8s linear infinite;
  }
`;

// SVG icons
const micIcon = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
  <line x1="12" x2="12" y1="19" y2="22"/>
</svg>`;

const checkIcon = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"/>
</svg>`;

const errorIcon = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="15" y1="9" x2="9" y2="15"/>
  <line x1="9" y1="9" x2="15" y2="15"/>
</svg>`;

const spinnerHtml = `<div id="plsfix-voice-spinner"></div>`;

/**
 * Create the voice overlay
 */
export function createVoiceOverlay(callbacks: VoiceOverlayCallbacks): VoiceOverlay {
  let backdrop: HTMLDivElement | null = null;
  let modal: HTMLDivElement | null = null;
  let micBtn: HTMLButtonElement | null = null;
  let statusEl: HTMLDivElement | null = null;
  let transcriptEl: HTMLDivElement | null = null;
  let applyBtn: HTMLButtonElement | null = null;
  let cancelBtn: HTMLButtonElement | null = null;

  let currentState: VoiceOverlayState = 'idle';
  let transcript = '';
  let interimTranscript = '';
  let speechRecognition: ContentSpeechRecognition | null = null;
  let isSubmitting = false;
  let processingTimeoutId: number | null = null;

  // Inject styles
  function injectStyles() {
    if (document.getElementById('plsfix-voice-styles')) return;
    const style = document.createElement('style');
    style.id = 'plsfix-voice-styles';
    style.textContent = overlayStyles;
    document.head.appendChild(style);
  }

  // Create DOM elements
  function createElements() {
    if (backdrop) return;

    injectStyles();

    backdrop = document.createElement('div');
    backdrop.id = 'plsfix-voice-overlay-backdrop';

    modal = document.createElement('div');
    modal.id = 'plsfix-voice-modal';

    modal.innerHTML = `
      <button id="plsfix-voice-mic-btn" type="button">
        ${micIcon}
      </button>
      <div id="plsfix-voice-status">Click the microphone to start</div>
      <div id="plsfix-voice-transcript-container">
        <div id="plsfix-voice-transcript" class="placeholder">Your voice command will appear here...</div>
      </div>
      <div id="plsfix-voice-buttons">
        <button class="plsfix-voice-btn plsfix-voice-btn-secondary" id="plsfix-voice-cancel" type="button">Cancel</button>
        <button class="plsfix-voice-btn plsfix-voice-btn-primary" id="plsfix-voice-apply" type="button">Apply Changes</button>
      </div>
      <div id="plsfix-voice-hint">Press Escape to cancel</div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Get element references
    micBtn = modal.querySelector('#plsfix-voice-mic-btn');
    statusEl = modal.querySelector('#plsfix-voice-status');
    transcriptEl = modal.querySelector('#plsfix-voice-transcript');
    applyBtn = modal.querySelector('#plsfix-voice-apply');
    cancelBtn = modal.querySelector('#plsfix-voice-cancel');

    console.log('=== Voice Overlay: Elements found ===');
    console.log('micBtn:', !!micBtn);
    console.log('statusEl:', !!statusEl);
    console.log('transcriptEl:', !!transcriptEl);
    console.log('applyBtn:', !!applyBtn);
    console.log('cancelBtn:', !!cancelBtn);

    // Setup event listeners
    micBtn?.addEventListener('click', handleMicClick);
    
    if (applyBtn) {
      console.log('=== Setting up Apply button handlers ===');

      // Use onclick
      applyBtn.onclick = () => {
        console.log('=== Apply button clicked (onclick)! ===');
        handleApply();
      };

      // Also use addEventListener
      applyBtn.addEventListener('click', () => {
        console.log('=== Apply button clicked (addEventListener)! ===');
      });

      // Also try mousedown as backup
      applyBtn.addEventListener('mousedown', () => {
        console.log('=== Apply button mousedown! ===');
      });

      // Use pointerdown to trigger apply (click isn't firing reliably)
      applyBtn.addEventListener('pointerdown', (e) => {
        console.log('=== Apply button pointerdown! ===');
        e.preventDefault();
        e.stopPropagation();
        try {
          handleApply();
        } catch (error) {
          console.warn('handleApply failed:', error);
          setState('error', 'Extension reloaded. Refresh the page.');
          setTimeout(() => hide(), 1500);
        }
      });

      // Initially disable until there's content
      applyBtn.disabled = true;
    }
    
    cancelBtn?.addEventListener('click', handleCancel);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) handleCancel();
    });

    // Keyboard listener
    document.addEventListener('keydown', handleKeyDown);

    // Setup speech recognition
    speechRecognition = createSpeechRecognition({
      onStart: () => {
        console.log('=== Speech Recognition: Started ===');
        setState('recording');
      },
      onResult: (text, isFinal) => {
        console.log('=== Speech Recognition: Result ===');
        console.log('Text:', text, 'isFinal:', isFinal);
        if (isFinal) {
          transcript += (transcript ? ' ' : '') + text;
          interimTranscript = '';
          console.log('Final transcript updated:', transcript);
        } else {
          interimTranscript = text;
          console.log('Interim transcript:', interimTranscript);
        }
        updateTranscriptDisplay();
      },
      onError: (error) => {
        console.log('=== Speech Recognition: Error ===', error);
        setState('error', error);
      },
      onEnd: () => {
        console.log('=== Speech Recognition: Ended ===');
        console.log('Current state:', currentState);
        if (currentState === 'recording') {
          setState('idle');
        }
      },
    });

    // Check support
    if (!speechRecognition.isSupported) {
      setState('error', 'Speech recognition is not supported in this browser.');
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!backdrop?.classList.contains('visible')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
  }

  function handleMicClick() {
    if (!speechRecognition) return;

    if (currentState === 'recording') {
      speechRecognition.stop();
      setState('idle');
    } else if (currentState === 'idle' || currentState === 'error') {
      transcript = '';
      interimTranscript = '';
      updateTranscriptDisplay();
      speechRecognition.start();
    }
  }

  function handleApply() {
    console.log('=== Voice Overlay: handleApply called ===');
    console.log('Current transcript:', transcript);
    console.log('Current interimTranscript:', interimTranscript);

    if (isSubmitting) {
      console.log('Already submitting, ignoring apply.');
      return;
    }
    
    // Combine final transcript with any remaining interim transcript
    const fullTranscript = (transcript + ' ' + interimTranscript).trim();
    console.log('Full transcript:', fullTranscript);
    
    if (!fullTranscript) {
      console.log('No transcript - showing error');
      setState('error', 'No command detected. Please try again.');
      return;
    }
    
    // Stop recognition and clear interim
    console.log('Stopping speech recognition...');
    speechRecognition?.stop();
    transcript = fullTranscript;
    interimTranscript = '';
    
    console.log('Setting state to processing...');
    setState('processing');
    isSubmitting = true;
    if (applyBtn) {
      applyBtn.disabled = true;
    }

    console.log('Calling onSubmit callback with:', fullTranscript);
    try {
      callbacks.onSubmit(fullTranscript);
      console.log('onSubmit callback completed');
    } catch (error) {
      console.warn('onSubmit failed:', error);
      setState('error', 'Extension reloaded. Refresh the page.');
      setTimeout(() => hide(), 1500);
    }
  }

  function handleCancel() {
    speechRecognition?.abort();
    hide();
    callbacks.onCancel();
  }

  function updateTranscriptDisplay() {
    if (!transcriptEl) return;

    const fullTranscript = transcript + (interimTranscript ? ` ${interimTranscript}` : '');

    if (!fullTranscript) {
      transcriptEl.className = 'placeholder';
      transcriptEl.textContent = 'Your voice command will appear here...';
    } else {
      transcriptEl.className = '';
      if (interimTranscript) {
        transcriptEl.innerHTML = `${transcript}<span class="interim"> ${interimTranscript}</span>`;
      } else {
        transcriptEl.textContent = transcript;
      }
    }

    // Enable/disable apply button - enable if we have any transcript (final or interim)
    if (applyBtn) {
      const hasContent = transcript.trim() || interimTranscript.trim();
      const shouldDisable = !hasContent || currentState === 'processing';
      console.log('=== updateTranscriptDisplay: Button state ===');
      console.log('hasContent:', hasContent, 'currentState:', currentState, 'shouldDisable:', shouldDisable);
      applyBtn.disabled = shouldDisable;
    }
  }

  function setState(state: VoiceOverlayState, message?: string) {
    console.log('=== Voice Overlay: setState ===');
    console.log('New state:', state, 'Message:', message);
    console.log('Previous state:', currentState);
    
    currentState = state;
    if (state !== 'processing') {
      isSubmitting = false;
      if (processingTimeoutId) {
        window.clearTimeout(processingTimeoutId);
        processingTimeoutId = null;
      }
    } else {
      // Guard: if no response comes back, show an error and re-enable
      if (processingTimeoutId) {
        window.clearTimeout(processingTimeoutId);
      }
      processingTimeoutId = window.setTimeout(() => {
        setState('error', 'No response from AI. Please try again.');
        if (applyBtn) applyBtn.disabled = false;
      }, 12000);
    }

    if (!micBtn || !statusEl) {
      console.log('ERROR: micBtn or statusEl is null!', { micBtn: !!micBtn, statusEl: !!statusEl });
      return;
    }

    // Reset classes
    micBtn.className = '';
    statusEl.className = '';

    switch (state) {
      case 'idle':
        micBtn.innerHTML = micIcon;
        statusEl.textContent = transcript ? 'Click Apply or continue speaking' : 'Click the microphone to start';
        break;

      case 'recording':
        micBtn.className = 'recording';
        micBtn.innerHTML = micIcon;
        statusEl.className = 'recording';
        statusEl.textContent = 'Listening... Click mic to stop';
        break;

      case 'processing':
        micBtn.className = 'processing';
        micBtn.innerHTML = spinnerHtml;
        statusEl.className = 'processing';
        statusEl.textContent = 'Processing with AI...';
        if (applyBtn) applyBtn.disabled = true;
        if (cancelBtn) cancelBtn.style.display = 'none';
        break;

      case 'success':
        micBtn.className = 'success';
        micBtn.innerHTML = checkIcon;
        statusEl.className = 'success';
        statusEl.textContent = message || 'Changes applied!';
        // Auto-close after success
        setTimeout(() => {
          hide();
        }, 1500);
        break;

      case 'error':
        micBtn.className = 'error';
        micBtn.innerHTML = errorIcon;
        statusEl.className = 'error';
        statusEl.textContent = message || 'An error occurred';
        if (cancelBtn) cancelBtn.style.display = '';
        break;
    }
  }

  function show() {
    createElements();
    if (!backdrop) return;

    // Reset state
    currentState = 'idle';
    transcript = '';
    interimTranscript = '';
    updateTranscriptDisplay();
    setState('idle');

    // Show cancel button
    if (cancelBtn) cancelBtn.style.display = '';

    backdrop.classList.add('visible');

    // Auto-start recording after a brief delay
    setTimeout(() => {
      if (speechRecognition?.isSupported && currentState === 'idle') {
        speechRecognition.start();
      }
    }, 300);
  }

  function hide() {
    speechRecognition?.abort();
    backdrop?.classList.remove('visible');
  }

  function destroy() {
    speechRecognition?.abort();
    document.removeEventListener('keydown', handleKeyDown);
    backdrop?.remove();
    document.getElementById('plsfix-voice-styles')?.remove();
    backdrop = null;
    modal = null;
  }

  return {
    show,
    hide,
    setState,
    destroy,
  };
}
