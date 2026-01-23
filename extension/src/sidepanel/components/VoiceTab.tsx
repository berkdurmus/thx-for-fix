import React, { useState, useCallback, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { colors, spacing, typography, API_BASE_URL } from '../../shared/constants';
import { useStore } from '../stores/StoreContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { VoiceCommandResult, VoiceChange, ElementInfo } from '../../shared/types';
import { generateId } from '../../shared/utils';

const Container = styled.div`
  padding: ${spacing.lg};
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Header = styled.div`
  margin-bottom: ${spacing.lg};
`;

const Title = styled.h2`
  font-size: ${typography.sizes.lg};
  font-weight: ${typography.weights.semibold};
  color: ${colors.primaryText};
  margin: 0 0 ${spacing.xs} 0;
`;

const Subtitle = styled.p`
  font-size: ${typography.sizes.sm};
  color: ${colors.secondaryText};
  margin: 0;
`;

const InputSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md};
  margin-bottom: ${spacing.lg};
`;

const TextInputWrapper = styled.div`
  position: relative;
`;

const TextInput = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: ${spacing.md};
  padding-right: 50px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  font-size: ${typography.sizes.base};
  font-family: ${typography.fontFamily};
  color: ${colors.primaryText};
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${colors.selectionBorder};
  }

  &::placeholder {
    color: ${colors.tertiaryText};
  }
`;

const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
`;

const MicButton = styled.button<{ $isRecording: boolean; $disabled?: boolean }>`
  position: absolute;
  right: ${spacing.sm};
  top: ${spacing.sm};
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: ${props => props.$isRecording ? '#EF4444' : colors.backgroundHover};
  color: ${props => props.$isRecording ? 'white' : colors.secondaryText};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: ${props => props.$disabled ? 0.4 : 1};

  ${props => props.$isRecording && css`
    animation: ${pulseAnimation} 1.5s infinite;
  `}

  &:hover:not(:disabled) {
    background: ${props => props.$isRecording ? '#DC2626' : colors.border};
  }
`;

const VoiceUnavailableNote = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
  padding: ${spacing.sm} ${spacing.md};
  background: ${colors.backgroundSecondary};
  border-radius: 6px;
  margin-bottom: ${spacing.md};
  font-size: ${typography.sizes.sm};
  color: ${colors.secondaryText};
`;

const MicIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const SubmitButton = styled.button`
  width: 100%;
  padding: ${spacing.md};
  border: none;
  border-radius: 8px;
  background: ${colors.primaryAction};
  color: white;
  font-size: ${typography.sizes.base};
  font-weight: ${typography.weights.medium};
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: ${colors.primaryActionHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusSection = styled.div`
  margin-bottom: ${spacing.lg};
`;

const spinAnimation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const StatusBadge = styled.div<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xs};
  padding: ${spacing.xs} ${spacing.sm};
  border-radius: 16px;
  font-size: ${typography.sizes.sm};
  font-weight: ${typography.weights.medium};
  
  ${props => {
    switch (props.$status) {
      case 'recording':
        return css`
          background: #FEE2E2;
          color: #DC2626;
        `;
      case 'processing':
        return css`
          background: #FEF3C7;
          color: #D97706;
        `;
      case 'applying':
        return css`
          background: #DBEAFE;
          color: #2563EB;
        `;
      case 'complete':
        return css`
          background: #D1FAE5;
          color: #059669;
        `;
      case 'error':
        return css`
          background: #FEE2E2;
          color: #DC2626;
        `;
      default:
        return css`
          background: ${colors.backgroundHover};
          color: ${colors.secondaryText};
        `;
    }
  }}
`;

const Spinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spinAnimation} 0.8s linear infinite;
`;

const ResultSection = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const InterpretationCard = styled.div`
  padding: ${spacing.md};
  background: ${colors.backgroundSecondary};
  border-radius: 8px;
  margin-bottom: ${spacing.md};
`;

const InterpretationLabel = styled.div`
  font-size: ${typography.sizes.xs};
  color: ${colors.tertiaryText};
  text-transform: uppercase;
  margin-bottom: ${spacing.xs};
`;

const InterpretationText = styled.div`
  font-size: ${typography.sizes.base};
  color: ${colors.primaryText};
`;

const ChangesPreview = styled.div`
  margin-bottom: ${spacing.md};
`;

const ChangeItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
  padding: ${spacing.sm} ${spacing.md};
  background: white;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  margin-bottom: ${spacing.xs};
`;

const ChangeIcon = styled.div<{ $type: string }>`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  
  ${props => props.$type === 'style' ? css`
    background: #EDE9FE;
    color: #7C3AED;
  ` : css`
    background: #DBEAFE;
    color: #2563EB;
  `}
`;

const ChangeDetails = styled.div`
  flex: 1;
  font-size: ${typography.sizes.sm};
  color: ${colors.primaryText};
`;

const ClarificationCard = styled.div`
  padding: ${spacing.md};
  background: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: 8px;
  margin-bottom: ${spacing.md};
`;

const ClarificationText = styled.p`
  font-size: ${typography.sizes.base};
  color: #92400E;
  margin: 0 0 ${spacing.sm} 0;
`;

const SuggestionChip = styled.button`
  display: inline-block;
  padding: ${spacing.xs} ${spacing.sm};
  background: white;
  border: 1px solid #FCD34D;
  border-radius: 16px;
  font-size: ${typography.sizes.sm};
  color: #92400E;
  cursor: pointer;
  margin-right: ${spacing.xs};
  margin-bottom: ${spacing.xs};

  &:hover {
    background: #FEF9C3;
  }
`;

const ErrorCard = styled.div`
  padding: ${spacing.md};
  background: #FEE2E2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  margin-bottom: ${spacing.md};
`;

const ErrorText = styled.p`
  font-size: ${typography.sizes.base};
  color: #DC2626;
  margin: 0;
`;

const HistorySection = styled.div`
  margin-top: ${spacing.lg};
  border-top: 1px solid ${colors.border};
  padding-top: ${spacing.lg};
`;

const HistoryTitle = styled.h3`
  font-size: ${typography.sizes.sm};
  font-weight: ${typography.weights.medium};
  color: ${colors.secondaryText};
  margin: 0 0 ${spacing.md} 0;
`;

const HistoryItem = styled.div`
  padding: ${spacing.sm};
  background: ${colors.backgroundSecondary};
  border-radius: 6px;
  margin-bottom: ${spacing.xs};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${colors.backgroundHover};
  }
`;

const HistoryTranscript = styled.div`
  font-size: ${typography.sizes.sm};
  color: ${colors.primaryText};
  margin-bottom: ${spacing.xs};
`;

const HistoryMeta = styled.div`
  font-size: ${typography.sizes.xs};
  color: ${colors.tertiaryText};
`;

const NoElementWarning = styled.div`
  padding: ${spacing.md};
  background: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: 8px;
  margin-bottom: ${spacing.md};
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
`;

const WarningIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const WarningText = styled.span`
  font-size: ${typography.sizes.sm};
  color: #92400E;
`;

export const VoiceTab: React.FC = observer(() => {
  const store = useStore();
  const { voiceMode, selectedElement } = store;
  const [inputText, setInputText] = useState('');
  const [pendingChanges, setPendingChanges] = useState<VoiceChange[]>([]);

  const handleSpeechResult = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal) {
      setInputText(prev => prev + (prev ? ' ' : '') + transcript);
      voiceMode.setTranscript(voiceMode.transcript + (voiceMode.transcript ? ' ' : '') + transcript);
    } else {
      voiceMode.setInterimTranscript(transcript);
    }
  }, [voiceMode]);

  const handleSpeechEnd = useCallback(() => {
    voiceMode.setStatus('idle');
    voiceMode.setInterimTranscript('');
  }, [voiceMode]);

  const handleSpeechError = useCallback((error: string) => {
    voiceMode.setError(error);
  }, [voiceMode]);

  const {
    isListening,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language: 'en-US',
    continuous: true,
    interimResults: true,
    onResult: handleSpeechResult,
    onEnd: handleSpeechEnd,
    onError: handleSpeechError,
  });
  
  // Show voice unavailable note if API exists but permissions failed
  const showVoiceUnavailable = !isSupported || (speechError ? speechError.includes('not available') : false);

  // Sync recording state
  useEffect(() => {
    if (isListening && voiceMode.status !== 'recording') {
      voiceMode.setStatus('recording');
    }
  }, [isListening, voiceMode]);

  const toggleRecording = useCallback(() => {
    if (isListening) {
      stopListening();
      voiceMode.setStatus('idle');
    } else {
      resetTranscript();
      voiceMode.reset();
      setInputText('');
      setPendingChanges([]);
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript, voiceMode]);

  const processCommand = useCallback(async () => {
    const transcript = inputText.trim();
    if (!transcript) return;

    voiceMode.setStatus('processing');
    voiceMode.setTranscript(transcript);
    voiceMode.setError(undefined);
    voiceMode.setClarificationNeeded(undefined);
    voiceMode.setSuggestions([]);
    setPendingChanges([]);

    try {
      // Get DOM context from content script if needed
      let elementInfo: ElementInfo | undefined;
      if (selectedElement) {
        elementInfo = {
          id: selectedElement.id,
          tagName: selectedElement.tagName,
          xpath: selectedElement.xpath,
          selector: selectedElement.selector,
          textContent: selectedElement.textContent,
          computedStyles: selectedElement.computedStyles,
          boundingRect: {} as DOMRect, // Content script will have the actual rect
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/voice/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          selectedElement: elementInfo,
          pageContext: {
            url: store.currentWebsiteUrl || window.location.href,
            title: document.title,
            visibleElements: [], // Could be populated from content script
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process voice command');
      }

      const result: VoiceCommandResult = await response.json();

      voiceMode.setInterpretation(result.interpretation);

      if (result.clarificationNeeded) {
        voiceMode.setClarificationNeeded(result.clarificationNeeded);
        voiceMode.setSuggestions(result.suggestions || []);
        voiceMode.setStatus('idle');
        return;
      }

      if (!result.understood || result.changes.length === 0) {
        voiceMode.setError(result.interpretation || 'Could not understand the command. Please try again.');
        return;
      }

      setPendingChanges(result.changes);
      
      // Apply changes
      store.applyVoiceChanges(result.changes.map(c => ({
        type: c.type,
        elementId: c.elementId || selectedElement?.id,
        styles: c.styles,
        text: c.text,
      })));

      // Add to history
      voiceMode.addToHistory({
        id: generateId(),
        transcript,
        interpretation: result.interpretation,
        changes: result.changes,
        timestamp: Date.now(),
        success: true,
      });

      // Clear input after successful command
      setInputText('');

    } catch (error) {
      console.error('Voice processing error:', error);
      voiceMode.setError(error instanceof Error ? error.message : 'An error occurred');
      voiceMode.setStatus('error');
    }
  }, [inputText, selectedElement, store, voiceMode]);

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    voiceMode.setClarificationNeeded(undefined);
    voiceMode.setSuggestions([]);
  };

  const handleHistoryClick = (transcript: string) => {
    setInputText(transcript);
  };

  const getStatusText = () => {
    switch (voiceMode.status) {
      case 'recording':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'applying':
        return 'Applying changes...';
      case 'complete':
        return 'Changes applied!';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  const formatChangeDescription = (change: VoiceChange): string => {
    if (change.type === 'text' && change.text) {
      return `Change text to "${change.text.substring(0, 30)}${change.text.length > 30 ? '...' : ''}"`;
    }
    if (change.type === 'style' && change.styles) {
      const styleCount = Object.keys(change.styles).length;
      const firstStyle = Object.entries(change.styles)[0];
      if (styleCount === 1 && firstStyle) {
        return `Set ${firstStyle[0]} to ${firstStyle[1]}`;
      }
      return `Apply ${styleCount} style changes`;
    }
    return 'Unknown change';
  };

  return (
    <Container>
      <Header>
        <Title>AI Edit</Title>
        <Subtitle>Describe changes naturally and let AI apply them</Subtitle>
      </Header>

      {!selectedElement && (
        <NoElementWarning>
          <WarningIcon />
          <WarningText>Select an element on the page first to apply changes</WarningText>
        </NoElementWarning>
      )}

      {showVoiceUnavailable && (
        <VoiceUnavailableNote>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Voice input unavailable in extension. Type your commands below.
        </VoiceUnavailableNote>
      )}

      <InputSection>
        <TextInputWrapper>
          <TextInput
            value={inputText + (voiceMode.interimTranscript ? ` ${voiceMode.interimTranscript}` : '')}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Describe your changes... e.g., 'Make the text bigger and blue'"
            disabled={voiceMode.status === 'processing' || voiceMode.status === 'applying'}
          />
          {!showVoiceUnavailable && (
            <MicButton
              $isRecording={isListening}
              $disabled={showVoiceUnavailable}
              onClick={toggleRecording}
              disabled={voiceMode.status === 'processing' || voiceMode.status === 'applying' || showVoiceUnavailable}
              title={showVoiceUnavailable ? 'Voice unavailable in extension' : isListening ? 'Stop recording' : 'Start recording'}
            >
              <MicIcon />
            </MicButton>
          )}
        </TextInputWrapper>

        <SubmitButton
          onClick={processCommand}
          disabled={
            !inputText.trim() ||
            voiceMode.status === 'processing' ||
            voiceMode.status === 'applying' ||
            !selectedElement
          }
        >
          {voiceMode.status === 'processing' ? 'Processing...' : 'Apply Changes'}
        </SubmitButton>
      </InputSection>

      {voiceMode.status !== 'idle' && (
        <StatusSection>
          <StatusBadge $status={voiceMode.status}>
            {(voiceMode.status === 'processing' || voiceMode.status === 'applying') && (
              <Spinner />
            )}
            {voiceMode.status === 'complete' && '✓'}
            {voiceMode.status === 'error' && '✕'}
            {voiceMode.status === 'recording' && '●'}
            {getStatusText()}
          </StatusBadge>
        </StatusSection>
      )}

      <ResultSection>
        {voiceMode.error && (
          <ErrorCard>
            <ErrorText>{voiceMode.error}</ErrorText>
          </ErrorCard>
        )}

        {voiceMode.clarificationNeeded && (
          <ClarificationCard>
            <ClarificationText>{voiceMode.clarificationNeeded}</ClarificationText>
            {voiceMode.suggestions.length > 0 && (
              <div>
                {voiceMode.suggestions.map((suggestion, index) => (
                  <SuggestionChip
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </SuggestionChip>
                ))}
              </div>
            )}
          </ClarificationCard>
        )}

        {voiceMode.interpretation && !voiceMode.error && (
          <InterpretationCard>
            <InterpretationLabel>Interpretation</InterpretationLabel>
            <InterpretationText>{voiceMode.interpretation}</InterpretationText>
          </InterpretationCard>
        )}

        {pendingChanges.length > 0 && (
          <ChangesPreview>
            {pendingChanges.map((change, index) => (
              <ChangeItem key={index}>
                <ChangeIcon $type={change.type}>
                  {change.type === 'style' ? 'S' : 'T'}
                </ChangeIcon>
                <ChangeDetails>{formatChangeDescription(change)}</ChangeDetails>
              </ChangeItem>
            ))}
          </ChangesPreview>
        )}

        {voiceMode.history.length > 0 && (
          <HistorySection>
            <HistoryTitle>Recent Commands</HistoryTitle>
            {voiceMode.history.slice(0, 5).map((item) => (
              <HistoryItem
                key={item.id}
                onClick={() => handleHistoryClick(item.transcript)}
              >
                <HistoryTranscript>"{item.transcript}"</HistoryTranscript>
                <HistoryMeta>
                  {item.changes.length} change{item.changes.length !== 1 ? 's' : ''} • {' '}
                  {new Date(item.timestamp).toLocaleTimeString()}
                </HistoryMeta>
              </HistoryItem>
            ))}
          </HistorySection>
        )}
      </ResultSection>
    </Container>
  );
});
