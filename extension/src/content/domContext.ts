/**
 * DOM Context extraction for voice/AI processing
 * 
 * Provides page context to help the LLM understand the page structure
 * and make better decisions about element identification.
 */

import { ElementSummary, DOMContextPayload, ElementInfo } from '../shared/types';

/**
 * Extract a summary of visible elements on the page
 */
export function getVisibleElements(limit: number = 50): ElementSummary[] {
  const elements: ElementSummary[] = [];
  const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  const importantTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'IMG', 'NAV', 'HEADER', 'FOOTER', 'MAIN', 'ARTICLE', 'SECTION'];
  
  // Get all important and interactive elements
  const selector = [...interactiveTags, ...importantTags].join(', ');
  const allElements = document.querySelectorAll(selector);
  
  for (const element of allElements) {
    if (elements.length >= limit) break;
    
    const htmlElement = element as HTMLElement;
    
    // Skip hidden elements
    const style = window.getComputedStyle(htmlElement);
    if (style.display === 'none' || style.visibility === 'hidden') {
      continue;
    }
    
    // Skip elements outside viewport
    const rect = htmlElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }
    
    // Check if element is at least partially visible
    const isVisible = (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
    
    if (!isVisible) {
      continue;
    }
    
    elements.push({
      tagName: htmlElement.tagName,
      id: htmlElement.id || undefined,
      className: htmlElement.className ? String(htmlElement.className).substring(0, 100) : undefined,
      textContent: getCleanTextContent(htmlElement, 100),
      isInteractive: interactiveTags.includes(htmlElement.tagName),
    });
  }
  
  return elements;
}

/**
 * Get clean text content from an element (truncated)
 */
function getCleanTextContent(element: HTMLElement, maxLength: number): string | undefined {
  const text = element.textContent?.trim();
  if (!text) return undefined;
  
  // Clean up whitespace
  const cleaned = text.replace(/\s+/g, ' ');
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  return cleaned.substring(0, maxLength) + '...';
}

/**
 * Get the current page context for voice processing
 */
export function getDOMContext(selectedElement?: HTMLElement): DOMContextPayload {
  let elementInfo: ElementInfo | undefined;
  
  if (selectedElement) {
    const computedStyle = window.getComputedStyle(selectedElement);
    const rect = selectedElement.getBoundingClientRect();
    
    elementInfo = {
      id: selectedElement.getAttribute('data-plsfix-id') || '',
      tagName: selectedElement.tagName,
      xpath: '', // Could be computed if needed
      selector: '', // Could be computed if needed
      textContent: selectedElement.textContent?.trim().substring(0, 200) || '',
      computedStyles: {
        fontFamily: computedStyle.fontFamily,
        fontWeight: computedStyle.fontWeight,
        fontSize: computedStyle.fontSize,
        color: computedStyle.color,
        backgroundColor: computedStyle.backgroundColor,
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
      boundingRect: rect,
    };
  }
  
  return {
    url: window.location.href,
    title: document.title,
    selectedElement: elementInfo,
    visibleElements: getVisibleElements(),
  };
}

/**
 * Get a simplified description of an element for the LLM
 */
export function describeElement(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const className = element.className ? `.${String(element.className).split(' ')[0]}` : '';
  const text = element.textContent?.trim().substring(0, 30);
  
  let description = tag;
  if (id) description += id;
  else if (className) description += className;
  if (text) description += ` "${text}"`;
  
  return description;
}

/**
 * Find elements matching a natural language description
 * (Basic implementation - could be enhanced with more sophisticated matching)
 */
export function findElementByDescription(description: string): HTMLElement | null {
  const lowerDesc = description.toLowerCase();
  
  // Try to match by tag name mentions
  const tagMappings: Record<string, string> = {
    'heading': 'h1, h2, h3, h4, h5, h6',
    'main heading': 'h1',
    'title': 'h1',
    'button': 'button, [role="button"]',
    'link': 'a',
    'image': 'img',
    'input': 'input',
    'text': 'p, span',
    'paragraph': 'p',
    'navigation': 'nav',
    'header': 'header',
    'footer': 'footer',
  };
  
  for (const [term, selector] of Object.entries(tagMappings)) {
    if (lowerDesc.includes(term)) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        // Check if this element matches any text mentioned
        const text = htmlEl.textContent?.toLowerCase() || '';
        // Extract quoted text from description
        const quotedMatch = description.match(/"([^"]+)"|'([^']+)'/);
        if (quotedMatch) {
          const quotedText = (quotedMatch[1] || quotedMatch[2]).toLowerCase();
          if (text.includes(quotedText)) {
            return htmlEl;
          }
        }
        // If no quoted text, return first visible match
        const style = window.getComputedStyle(htmlEl);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          const rect = htmlEl.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return htmlEl;
          }
        }
      }
    }
  }
  
  return null;
}
