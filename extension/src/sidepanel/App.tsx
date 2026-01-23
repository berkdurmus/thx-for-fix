import React, { useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { Header } from './components/Header';
import { TabNavigation } from './components/TabNavigation';
import { DesignTab } from './components/DesignTab';
import { ChangesTab } from './components/ChangesTab';
import { PullRequestsTab } from './components/PullRequestsTab';
import { AICommentsTab } from './components/AICommentsTab';
import { VoiceTab } from './components/VoiceTab';
import { StoreProvider, useStore } from './stores/StoreContext';
import { colors, API_BASE_URL } from '../shared/constants';
import { VoiceTranscriptPayload, VoiceCommandResult } from '../shared/types';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: ${colors.background};
`;

const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
`;

const AppContent: React.FC = observer(() => {
  const store = useStore();
  const { activeTab } = store.ui;

  // Process voice transcript from content script overlay
  const processVoiceTranscript = useCallback(async (payload: VoiceTranscriptPayload) => {
    console.log('=== Sidepanel: Processing voice transcript ===');
    console.log('Transcript:', payload.transcript);
    console.log('Selected Element:', payload.selectedElement);
    console.log('API URL:', `${API_BASE_URL}/api/voice/process`);

    try {
      const requestBody = {
        transcript: payload.transcript,
        selectedElement: payload.selectedElement,
        pageContext: {
          url: payload.pageUrl,
          title: payload.pageTitle,
          visibleElements: [],
        },
      };
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const candidateBaseUrls = [API_BASE_URL, 'http://127.0.0.1:3001'];
      let response: Response | null = null;
      let result: VoiceCommandResult | null = null;
      let lastError: Error | null = null;

      for (const baseUrl of candidateBaseUrls) {
        const url = `${baseUrl}/api/voice/process`;
        console.log('Trying voice API:', url);
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          console.log('Response status:', response.status);
          result = await response.json();
          console.log('Voice processing result:', JSON.stringify(result, null, 2));

          if (!response.ok) {
            throw new Error(result?.error || 'Failed to process voice command');
          }
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Failed to fetch');
          console.warn(`Voice API failed for ${url}:`, lastError.message);
          response = null;
          result = null;
        }
      }

      if (!response || !result) {
        throw lastError || new Error('Failed to fetch');
      }

      // Send result back to content script
      const resultPayload = {
        success: result.understood && result.changes.length > 0,
        interpretation: result.interpretation,
        changes: result.changes,
        error: result.clarificationNeeded || (result.understood ? undefined : 'Could not understand the command'),
      };
      console.log('Sending result to content script:', JSON.stringify(resultPayload, null, 2));

      chrome.runtime.sendMessage({
        type: 'VOICE_PROCESSING_RESULT',
        payload: resultPayload,
      });

    } catch (error) {
      console.error('Voice processing error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch. Is the backend running on localhost:3001?';
      console.log('Sending error to content script:', errorMessage);
      
      chrome.runtime.sendMessage({
        type: 'VOICE_PROCESSING_ERROR',
        payload: {
          error: errorMessage,
        },
      });
    }
  }, []);

  useEffect(() => {
    // Notify background that side panel is ready
    chrome.runtime.sendMessage({ type: 'SIDEPANEL_READY' });

    // Listen for messages from content script (via background)
    const handleMessage = (message: { type: string; payload?: unknown }) => {
      console.log('Sidepanel received message:', message.type, message.payload);
      switch (message.type) {
        case 'ELEMENT_SELECTED':
          const elementPayload = message.payload as { element: unknown };
          if (elementPayload?.element) {
            store.setSelectedElement(elementPayload.element as never);
          }
          break;
        case 'ELEMENT_DESELECTED':
          store.clearSelectedElement();
          break;
        case 'CHANGE_RECORDED':
          const changePayload = message.payload as { change: unknown };
          if (changePayload?.change) {
            store.addChange(changePayload.change as never);
          }
          break;
        case 'OPEN_VOICE_INPUT':
        case 'VOICE_COMMAND_START':
          // Switch to voice tab when Cmd+K is pressed
          store.openVoiceInput();
          break;
        case 'VOICE_TRANSCRIPT':
          // Process voice transcript from content script overlay
          const transcriptPayload = message.payload as VoiceTranscriptPayload;
          processVoiceTranscript(transcriptPayload);
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [store, processVoiceTranscript]);

  const renderTab = () => {
    switch (activeTab) {
      case 'design':
        return <DesignTab />;
      case 'changes':
        return <ChangesTab />;
      case 'pullRequests':
        return <PullRequestsTab />;
      case 'aiComments':
        return <AICommentsTab />;
      case 'voice':
        return <VoiceTab />;
      default:
        return <DesignTab />;
    }
  };

  return (
    <AppContainer>
      <Header />
      <TabNavigation />
      <TabContent>{renderTab()}</TabContent>
    </AppContainer>
  );
});

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;
