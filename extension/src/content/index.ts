import { createElementInfo, generateId } from '../shared/utils';
import { Change, ElementInfo, Message, ApplyStylePayload, ApplyTextPayload, DOMContextPayload, VoiceProcessingResultPayload, VoiceChange } from '../shared/types';
import { getDOMContext } from './domContext';
import { createVoiceOverlay, VoiceOverlay } from './voiceOverlay';

// State
let isEditModeEnabled = false;
let selectedElement: HTMLElement | null = null;
let hoveredElement: HTMLElement | null = null;
let overlayContainer: HTMLDivElement | null = null;
let selectedOverlay: HTMLDivElement | null = null;
let hoverOverlay: HTMLDivElement | null = null;
let editTooltip: HTMLDivElement | null = null;
let voiceOverlay: VoiceOverlay | null = null;
const elementIdMap = new Map<string, HTMLElement>();
const originalStates = new Map<string, { textContent: string; styles: Record<string, string> }>();

// Initialize
function init() {
  createOverlayContainer();
  setupMessageListener();
  initVoiceOverlay();
}

// Initialize voice overlay
function initVoiceOverlay() {
  voiceOverlay = createVoiceOverlay({
    onSubmit: handleVoiceSubmit,
    onCancel: handleVoiceCancel,
  });
}

// Handle voice transcript submission
function handleVoiceSubmit(transcript: string) {
  console.log('=== Content Script: Voice Submit ===');
  console.log('Transcript:', transcript);
  console.log('Selected element:', selectedElement);

  try {
    if (!selectedElement) {
      voiceOverlay?.setState('error', 'Please select an element first');
      return;
    }

    const elementId = selectedElement.getAttribute('data-plsfix-id');
    const elementInfo = elementId ? createElementInfo(selectedElement, elementId) : null;

    console.log('Element ID:', elementId);
    console.log('Element Info:', elementInfo);

    // Send transcript to sidepanel for processing
    const payload = {
      transcript,
      selectedElement: elementInfo,
      pageUrl: window.location.href,
      pageTitle: document.title,
    };
    console.log('Sending VOICE_TRANSCRIPT:', payload);

    const sent = sendMessage('VOICE_TRANSCRIPT', payload);
    if (!sent) {
      voiceOverlay?.setState('error', 'Extension reloaded. Refresh the page.');
      setTimeout(() => voiceOverlay?.hide(), 1500);
    }
  } catch (error) {
    console.warn('handleVoiceSubmit failed:', error);
    voiceOverlay?.setState('error', 'Extension reloaded. Refresh the page.');
    setTimeout(() => voiceOverlay?.hide(), 1500);
  }
}

// Handle voice cancel
function handleVoiceCancel() {
  // Nothing special needed
}

// Show voice overlay
function showVoiceOverlay() {
  if (!isExtensionContextValid()) {
    showNotification('Extension reloaded. Refresh the page.');
    return;
  }
  if (!selectedElement) {
    // Show a brief notification that element selection is required
    showNotification('Please select an element first (click on any element)');
    return;
  }
  voiceOverlay?.show();
}

// Show a brief notification
function showNotification(message: string) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1F2937;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    animation: plsfix-notification-in 0.3s ease;
  `;
  notification.textContent = message;

  // Add animation keyframes if not exists
  if (!document.getElementById('plsfix-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'plsfix-notification-styles';
    style.textContent = `
      @keyframes plsfix-notification-in {
        from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes plsfix-notification-out {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'plsfix-notification-out 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// Apply voice changes received from sidepanel
function applyVoiceChanges(changes: VoiceChange[]) {
  for (const change of changes) {
    const elementId = change.elementId || selectedElement?.getAttribute('data-plsfix-id');
    if (!elementId) continue;

    if (change.type === 'style' && change.styles) {
      applyStyle(elementId, change.styles);
    } else if (change.type === 'text' && change.text) {
      applyText(elementId, change.text);
    }
  }
}

// Create overlay container for selection highlights
function createOverlayContainer() {
  if (overlayContainer) return;

  overlayContainer = document.createElement('div');
  overlayContainer.id = 'plsfix-overlay-container';
  overlayContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483646;
  `;
  document.body.appendChild(overlayContainer);

  // Create hover overlay
  hoverOverlay = document.createElement('div');
  hoverOverlay.id = 'plsfix-hover-overlay';
  hoverOverlay.style.cssText = `
    position: absolute;
    border: 2px dashed #3B82F6;
    background-color: rgba(59, 130, 246, 0.05);
    pointer-events: none;
    display: none;
    transition: all 0.1s ease;
  `;
  overlayContainer.appendChild(hoverOverlay);

  // Create selected overlay
  selectedOverlay = document.createElement('div');
  selectedOverlay.id = 'plsfix-selected-overlay';
  selectedOverlay.style.cssText = `
    position: absolute;
    border: 2px solid #3B82F6;
    background-color: rgba(59, 130, 246, 0.05);
    pointer-events: none;
    display: none;
  `;
  overlayContainer.appendChild(selectedOverlay);

  // Create edit tooltip
  editTooltip = document.createElement('div');
  editTooltip.id = 'plsfix-edit-tooltip';
  editTooltip.innerHTML = `
    <span style="display: flex; align-items: center; gap: 4px;">
      Edit with AI
      <span style="opacity: 0.7; font-size: 10px;">⌘+K</span>
    </span>
  `;
  editTooltip.style.cssText = `
    position: absolute;
    background-color: #130F18;
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    font-size: 12px;
    font-weight: 500;
    display: none;
    pointer-events: auto;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    white-space: nowrap;
  `;
  overlayContainer.appendChild(editTooltip);
}

// Setup message listener
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    switch (message.type) {
      case 'TOGGLE_EDIT_MODE':
        const { enabled } = message.payload as { enabled: boolean };
        if (enabled) {
          enableEditMode();
        } else {
          disableEditMode();
        }
        break;

      case 'APPLY_STYLE':
        const stylePayload = message.payload as ApplyStylePayload;
        applyStyle(stylePayload.elementId, stylePayload.styles);
        break;

      case 'APPLY_TEXT':
        const textPayload = message.payload as ApplyTextPayload;
        applyText(textPayload.elementId, textPayload.text);
        break;

      case 'REVERT_CHANGE':
        const { changeId } = message.payload as { changeId: string };
        revertChange(changeId);
        break;

      case 'GET_DOM_CONTEXT':
        // Get DOM context for voice processing
        const context = getDOMContext(selectedElement || undefined);
        sendResponse({ success: true, context });
        return true;

      case 'OPEN_VOICE_INPUT':
        // Show voice overlay on the page
        showVoiceOverlay();
        break;

      case 'VOICE_PROCESSING_RESULT':
        console.log('=== Content Script: Received VOICE_PROCESSING_RESULT ===');
        const resultPayload = message.payload as VoiceProcessingResultPayload;
        console.log('Result payload:', resultPayload);
        if (resultPayload.success && resultPayload.changes) {
          console.log('Applying changes:', resultPayload.changes);
          applyVoiceChanges(resultPayload.changes);
          voiceOverlay?.setState('success', resultPayload.interpretation || 'Changes applied!');
        } else {
          console.log('No changes or not successful:', resultPayload.error);
          voiceOverlay?.setState('error', resultPayload.error || 'Failed to process command');
        }
        break;

      case 'VOICE_PROCESSING_ERROR':
        console.log('=== Content Script: Received VOICE_PROCESSING_ERROR ===');
        const errorPayload = message.payload as { error: string };
        console.log('Error:', errorPayload.error);
        voiceOverlay?.setState('error', errorPayload.error || 'An error occurred');
        break;
    }

    sendResponse({ success: true });
    return true;
  });
}

// Enable edit mode
function enableEditMode() {
  if (isEditModeEnabled) return;
  isEditModeEnabled = true;

  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('dblclick', handleDoubleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
}

// Disable edit mode
function disableEditMode() {
  if (!isEditModeEnabled) return;
  isEditModeEnabled = false;

  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('dblclick', handleDoubleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);

  clearSelection();
  hideHoverOverlay();
}

// Handle mouse over
function handleMouseOver(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!isValidElement(target)) return;

  hoveredElement = target;
  showHoverOverlay(target);
}

// Handle mouse out
function handleMouseOut(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target === hoveredElement) {
    hoveredElement = null;
    hideHoverOverlay();
  }
}

// Handle click
function handleClick(e: MouseEvent) {
  const target = e.target as HTMLElement;

  // Ignore clicks on our own UI
  if (target.closest('#plsfix-overlay-container')) return;

  if (!isValidElement(target)) return;

  e.preventDefault();
  e.stopPropagation();

  selectElement(target);
}

// Handle double click for inline editing
function handleDoubleClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!isValidElement(target)) return;
  if (!selectedElement || selectedElement !== target) return;

  e.preventDefault();
  e.stopPropagation();

  enableInlineEditing(target);
}

// Handle keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  // Cmd+K or Ctrl+K for AI/Voice edit
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    // Show voice overlay on the page
    showVoiceOverlay();
    console.log('Voice Edit triggered');
  }

  // Escape to deselect
  if (e.key === 'Escape') {
    clearSelection();
  }
}

// Check if element is valid for selection
function isValidElement(element: HTMLElement): boolean {
  if (!element || !element.tagName) return false;

  // Skip our own elements
  if (element.closest('#plsfix-overlay-container')) return false;

  // Skip invisible elements
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  // Skip script, style, etc.
  const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'META', 'LINK', 'HEAD', 'HTML'];
  if (skipTags.includes(element.tagName)) return false;

  return true;
}

// Select an element
function selectElement(element: HTMLElement) {
  // Clear previous selection
  if (selectedElement && selectedElement !== element) {
    selectedElement.removeAttribute('data-plsfix-selected');
  }

  selectedElement = element;

  // Generate or get element ID
  let elementId = element.getAttribute('data-plsfix-id');
  if (!elementId) {
    elementId = generateId();
    element.setAttribute('data-plsfix-id', elementId);
    elementIdMap.set(elementId, element);

    // Store original state
    const computedStyle = window.getComputedStyle(element);
    originalStates.set(elementId, {
      textContent: element.textContent || '',
      styles: {
        color: computedStyle.color,
        backgroundColor: computedStyle.backgroundColor,
        fontSize: computedStyle.fontSize,
        fontWeight: computedStyle.fontWeight,
        fontFamily: computedStyle.fontFamily,
        textAlign: computedStyle.textAlign,
        fontStyle: computedStyle.fontStyle,
        textDecoration: computedStyle.textDecoration,
        width: computedStyle.width,
        height: computedStyle.height,
        paddingTop: computedStyle.paddingTop,
        paddingRight: computedStyle.paddingRight,
        paddingBottom: computedStyle.paddingBottom,
        paddingLeft: computedStyle.paddingLeft,
        marginTop: computedStyle.marginTop,
        marginRight: computedStyle.marginRight,
        marginBottom: computedStyle.marginBottom,
        marginLeft: computedStyle.marginLeft,
      },
    });
  }

  element.setAttribute('data-plsfix-selected', 'true');
  showSelectedOverlay(element);
  showEditTooltip(element);
  hideHoverOverlay();

  // Send to side panel
  const elementInfo = createElementInfo(element, elementId);
  sendMessage('ELEMENT_SELECTED', { element: elementInfo });
}

// Clear selection
function clearSelection() {
  if (selectedElement) {
    selectedElement.removeAttribute('data-plsfix-selected');
    selectedElement = null;
  }
  hideSelectedOverlay();
  hideEditTooltip();
  sendMessage('ELEMENT_DESELECTED', {});
}

// Show hover overlay
function showHoverOverlay(element: HTMLElement) {
  if (!hoverOverlay || element === selectedElement) return;

  const rect = element.getBoundingClientRect();
  hoverOverlay.style.left = `${rect.left}px`;
  hoverOverlay.style.top = `${rect.top}px`;
  hoverOverlay.style.width = `${rect.width}px`;
  hoverOverlay.style.height = `${rect.height}px`;
  hoverOverlay.style.display = 'block';
}

// Hide hover overlay
function hideHoverOverlay() {
  if (hoverOverlay) {
    hoverOverlay.style.display = 'none';
  }
}

// Show selected overlay
function showSelectedOverlay(element: HTMLElement) {
  if (!selectedOverlay) return;

  const rect = element.getBoundingClientRect();
  selectedOverlay.style.left = `${rect.left}px`;
  selectedOverlay.style.top = `${rect.top}px`;
  selectedOverlay.style.width = `${rect.width}px`;
  selectedOverlay.style.height = `${rect.height}px`;
  selectedOverlay.style.display = 'block';

  // Update position on scroll
  const updatePosition = () => {
    if (!selectedElement) return;
    const newRect = selectedElement.getBoundingClientRect();
    selectedOverlay!.style.left = `${newRect.left}px`;
    selectedOverlay!.style.top = `${newRect.top}px`;
    selectedOverlay!.style.width = `${newRect.width}px`;
    selectedOverlay!.style.height = `${newRect.height}px`;

    if (editTooltip && editTooltip.style.display !== 'none') {
      editTooltip.style.left = `${newRect.left}px`;
      editTooltip.style.top = `${newRect.top - 40}px`;
    }
  };

  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);
}

// Hide selected overlay
function hideSelectedOverlay() {
  if (selectedOverlay) {
    selectedOverlay.style.display = 'none';
  }
}

// Show edit tooltip
function showEditTooltip(element: HTMLElement) {
  if (!editTooltip) return;

  const rect = element.getBoundingClientRect();
  editTooltip.style.left = `${rect.left}px`;
  editTooltip.style.top = `${rect.top - 40}px`;
  editTooltip.style.display = 'block';
}

// Hide edit tooltip
function hideEditTooltip() {
  if (editTooltip) {
    editTooltip.style.display = 'none';
  }
}

// Enable inline editing
function enableInlineEditing(element: HTMLElement) {
  const originalText = element.textContent || '';
  element.contentEditable = 'true';
  element.focus();

  // Select all text
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  const handleBlur = () => {
    element.contentEditable = 'false';
    element.removeEventListener('blur', handleBlur);
    element.removeEventListener('keydown', handleKeyDown);

    const newText = element.textContent || '';
    if (newText !== originalText) {
      recordTextChange(element, originalText, newText);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      element.blur();
    }
    if (e.key === 'Escape') {
      element.textContent = originalText;
      element.blur();
    }
  };

  element.addEventListener('blur', handleBlur);
  element.addEventListener('keydown', handleKeyDown);
}

// Apply style to element
function applyStyle(elementId: string, styles: Record<string, string>) {
  const element = elementIdMap.get(elementId);
  if (!element) return;

  const original = originalStates.get(elementId);
  const changedStyles: Record<string, string> = {};

  for (const [key, value] of Object.entries(styles)) {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    const styleObj = element.style as unknown as Record<string, string>;
    changedStyles[key] = styleObj[key] || original?.styles[key] || '';
    styleObj[key] = value;
  }

  // Record change
  recordStyleChange(element, changedStyles, styles);
}

// Apply text to element
function applyText(elementId: string, text: string) {
  const element = elementIdMap.get(elementId);
  if (!element) return;

  const originalText = element.textContent || '';
  element.textContent = text;

  if (text !== originalText) {
    recordTextChange(element, originalText, text);
  }
}

// Record text change
function recordTextChange(element: HTMLElement, original: string, modified: string) {
  const elementId = element.getAttribute('data-plsfix-id') || generateId();

  const change: Change = {
    id: generateId(),
    type: 'text',
    elementId,
    elementTag: element.tagName.toLowerCase(),
    xpath: '', // Will be set by util
    selector: '', // Will be set by util
    timestamp: Date.now(),
    original: { textContent: original },
    modified: { textContent: modified },
  };

  sendMessage('CHANGE_RECORDED', { change });

  // Add visual indicator
  element.style.outline = '2px solid #10B981';
  setTimeout(() => {
    element.style.outline = '';
  }, 1000);
}

// Record style change
function recordStyleChange(
  element: HTMLElement,
  original: Record<string, string>,
  modified: Record<string, string>
) {
  const elementId = element.getAttribute('data-plsfix-id') || generateId();

  const change: Change = {
    id: generateId(),
    type: 'style',
    elementId,
    elementTag: element.tagName.toLowerCase(),
    xpath: '',
    selector: '',
    timestamp: Date.now(),
    original: { styles: original },
    modified: { styles: modified },
  };

  sendMessage('CHANGE_RECORDED', { change });
}

// Revert a change
function revertChange(changeId: string) {
  // TODO: Implement change revert
  console.log('Reverting change:', changeId);
}

// Send message to background/side panel
function isExtensionContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

function sendMessage(type: string, payload: unknown): boolean {
  try {
    if (!isExtensionContextValid()) {
      throw new Error('Extension context invalidated');
    }

    chrome.runtime.sendMessage({ type, payload }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.warn('sendMessage failed:', error.message);
        showNotification('Extension reloaded. Please refresh the page.');
        voiceOverlay?.setState('error', 'Extension reloaded. Refresh the page.');
      }
    });
    return true;
  } catch (error) {
    console.warn('sendMessage failed:', error);
    showNotification('Extension reloaded. Please refresh the page.');
    voiceOverlay?.setState('error', 'Extension reloaded. Refresh the page.');
    return false;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
