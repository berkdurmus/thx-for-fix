/**
 * Prompts for voice intent processing
 */

export const VOICE_SYSTEM_PROMPT = `You are a UI/UX assistant that helps users make visual changes to web pages. Your job is to interpret natural language descriptions of desired changes and convert them into specific CSS style changes or text modifications.

## Your Capabilities

You can help with:
1. **Style changes**: Colors, fonts, sizes, spacing, alignment, visibility
2. **Text changes**: Updating text content, fixing typos, changing labels
3. **Combined changes**: Both style and text in one command

## Rules

1. **Output Format**: Always respond with valid JSON matching the schema provided
2. **CSS Property Names**: Use camelCase JavaScript style names (fontSize, not font-size)
3. **CSS Values**: Output valid CSS values (e.g., "#FF0000", "16px", "bold")
4. **Relative Terms**: Convert relative descriptions to reasonable CSS values:
   - "bigger/larger" → increase by ~25-50%
   - "much bigger" → increase by ~100%
   - "smaller" → decrease by ~25%
   - "bolder" → increase font-weight
   - "darker" → reduce lightness
   - "lighter" → increase lightness
5. **Colors**: Accept color names and convert to valid CSS (red → #EF4444, blue → #3B82F6)
6. **Ambiguity**: If the request is unclear, ask for clarification with helpful suggestions
7. **Safety**: Never output JavaScript, HTML tags, or potentially harmful content

## Common Patterns

- "make it red" → { type: "style", styles: { color: "#EF4444" } }
- "change the text to X" → { type: "text", text: "X" }
- "make the font bigger" → { type: "style", styles: { fontSize: "20px" } }
- "center this" → { type: "style", styles: { textAlign: "center" } }
- "add more padding" → { type: "style", styles: { padding: "24px" } }
- "hide this" → { type: "style", styles: { display: "none" } }
- "make it bold and blue" → { type: "style", styles: { fontWeight: "700", color: "#3B82F6" } }

## Current Context

You will be given:
- The user's voice/text command
- Information about the currently selected element (if any)
- Page context (URL, title)

Use this context to make informed decisions about what changes to apply.`;

export const VOICE_USER_PROMPT_TEMPLATE = `## User's Request
"{{transcript}}"

## Selected Element
{{#if selectedElement}}
- **Tag**: {{selectedElement.tagName}}
- **Text Content**: "{{selectedElement.textContent}}"
{{#if selectedElement.computedStyles}}
- **Current Styles**:
  - Font: {{selectedElement.computedStyles.fontFamily}} {{selectedElement.computedStyles.fontWeight}} {{selectedElement.computedStyles.fontSize}}
  - Color: {{selectedElement.computedStyles.color}}
  - Background: {{selectedElement.computedStyles.backgroundColor}}
  - Alignment: {{selectedElement.computedStyles.textAlign}}
{{/if}}
{{else}}
No element is currently selected. If the command requires targeting a specific element, you should ask the user to select one first.
{{/if}}

## Page Context
- **URL**: {{pageContext.url}}
- **Title**: {{pageContext.title}}

## Output Schema

Respond with JSON in this exact format:
{
  "understood": boolean,          // true if you understood the intent
  "interpretation": string,       // Human-readable description of what you understood
  "changes": [                    // Array of changes to apply (empty if not understood)
    {
      "type": "style" | "text",   // Type of change
      "elementId": string | null, // Element ID if targeting selected element
      "styles": { ... } | null,   // CSS styles to apply (for style type)
      "text": string | null       // New text content (for text type)
    }
  ],
  "clarificationNeeded": string | null,  // Question to ask if unclear
  "suggestions": string[] | null         // Suggested alternatives
}

## Important Notes
- If no element is selected and the command requires one, set understood=false and clarificationNeeded to ask them to select an element
- If the command is ambiguous (e.g., "make it bigger" without context), ask for clarification
- Always provide a helpful interpretation even if you need clarification
- Multiple changes can be combined in the changes array`;

/**
 * Build the user prompt with context
 */
export function buildVoicePrompt(
  transcript: string,
  selectedElement?: {
    tagName: string;
    textContent?: string;
    computedStyles?: Record<string, string>;
  },
  pageContext?: {
    url: string;
    title: string;
  }
): string {
  let prompt = VOICE_USER_PROMPT_TEMPLATE;
  
  // Replace transcript
  prompt = prompt.replace('{{transcript}}', transcript);
  
  // Handle selected element
  if (selectedElement) {
    prompt = prompt.replace('{{#if selectedElement}}', '');
    prompt = prompt.replace('{{else}}', '<!-- else -->');
    prompt = prompt.replace('No element is currently selected. If the command requires targeting a specific element, you should ask the user to select one first.', '');
    prompt = prompt.replace('{{/if}}', '');
    prompt = prompt.replace('{{selectedElement.tagName}}', selectedElement.tagName || 'unknown');
    prompt = prompt.replace('{{selectedElement.textContent}}', (selectedElement.textContent || '').substring(0, 100));
    
    if (selectedElement.computedStyles) {
      prompt = prompt.replace('{{#if selectedElement.computedStyles}}', '');
      prompt = prompt.replace('{{selectedElement.computedStyles.fontFamily}}', selectedElement.computedStyles.fontFamily || '');
      prompt = prompt.replace('{{selectedElement.computedStyles.fontWeight}}', selectedElement.computedStyles.fontWeight || '');
      prompt = prompt.replace('{{selectedElement.computedStyles.fontSize}}', selectedElement.computedStyles.fontSize || '');
      prompt = prompt.replace('{{selectedElement.computedStyles.color}}', selectedElement.computedStyles.color || '');
      prompt = prompt.replace('{{selectedElement.computedStyles.backgroundColor}}', selectedElement.computedStyles.backgroundColor || '');
      prompt = prompt.replace('{{selectedElement.computedStyles.textAlign}}', selectedElement.computedStyles.textAlign || '');
      // Remove closing if for styles
      const styleIfEndIndex = prompt.indexOf('{{/if}}');
      if (styleIfEndIndex > -1) {
        prompt = prompt.substring(0, styleIfEndIndex) + prompt.substring(styleIfEndIndex + 7);
      }
    } else {
      // Remove style block
      const styleBlockStart = prompt.indexOf('{{#if selectedElement.computedStyles}}');
      const styleBlockEnd = prompt.indexOf('{{/if}}', styleBlockStart) + 7;
      if (styleBlockStart > -1 && styleBlockEnd > styleBlockStart) {
        prompt = prompt.substring(0, styleBlockStart) + prompt.substring(styleBlockEnd);
      }
    }
  } else {
    // Remove selected element block, keep the else content
    prompt = prompt.replace('{{#if selectedElement}}', '<!-- no element -->');
    const elseStart = prompt.indexOf('{{else}}');
    const endIfIndex = prompt.indexOf('{{/if}}', elseStart);
    if (elseStart > -1 && endIfIndex > -1) {
      // Keep only the else content
      const beforeIf = prompt.substring(0, prompt.indexOf('<!-- no element -->'));
      const elseContent = prompt.substring(elseStart + 8, endIfIndex);
      const afterEndIf = prompt.substring(endIfIndex + 7);
      prompt = beforeIf + elseContent + afterEndIf;
    }
  }
  
  // Handle page context
  prompt = prompt.replace('{{pageContext.url}}', pageContext?.url || 'unknown');
  prompt = prompt.replace('{{pageContext.title}}', pageContext?.title || 'unknown');
  
  // Clean up any remaining template artifacts
  prompt = prompt.replace(/<!-- [^>]+ -->/g, '');
  prompt = prompt.replace(/\{\{[^}]+\}\}/g, '');
  
  return prompt;
}
