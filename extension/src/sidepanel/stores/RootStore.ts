import { types, Instance, SnapshotIn, SnapshotOut } from 'mobx-state-tree';

// Element Model
const ComputedStyleModel = types.model('ComputedStyle', {
  fontFamily: types.optional(types.string, ''),
  fontWeight: types.optional(types.string, ''),
  fontSize: types.optional(types.string, ''),
  color: types.optional(types.string, ''),
  backgroundColor: types.optional(types.string, ''),
  textAlign: types.optional(types.string, ''),
  fontStyle: types.optional(types.string, ''),
  textDecoration: types.optional(types.string, ''),
  width: types.optional(types.string, ''),
  height: types.optional(types.string, ''),
  paddingTop: types.optional(types.string, ''),
  paddingRight: types.optional(types.string, ''),
  paddingBottom: types.optional(types.string, ''),
  paddingLeft: types.optional(types.string, ''),
  marginTop: types.optional(types.string, ''),
  marginRight: types.optional(types.string, ''),
  marginBottom: types.optional(types.string, ''),
  marginLeft: types.optional(types.string, ''),
});

const ElementModel = types.model('Element', {
  id: types.identifier,
  tagName: types.string,
  xpath: types.string,
  selector: types.string,
  textContent: types.string,
  computedStyles: ComputedStyleModel,
});

// Change Model
const ChangeOriginalModel = types.model('ChangeOriginal', {
  textContent: types.maybe(types.string),
  styles: types.maybe(types.frozen()),
});

const ChangeModel = types
  .model('Change', {
    id: types.identifier,
    type: types.enumeration(['text', 'style']),
    elementId: types.string,
    elementTag: types.string,
    xpath: types.string,
    selector: types.string,
    timestamp: types.number,
    original: ChangeOriginalModel,
    modified: ChangeOriginalModel,
  })
  .actions((self) => ({
    revert() {
      chrome.runtime.sendMessage({
        type: 'REVERT_CHANGE',
        payload: { changeId: self.id },
      });
    },
  }));

// Repository Model
const RepositoryModel = types.model('Repository', {
  id: types.identifierNumber,
  name: types.string,
  fullName: types.string,
  defaultBranch: types.string,
  private: types.boolean,
});

// Branch Model
const BranchModel = types.model('Branch', {
  name: types.string,
  commit: types.string,
});

// Pull Request Model
const PullRequestModel = types.model('PullRequest', {
  id: types.identifier,
  number: types.number,
  title: types.string,
  url: types.string,
  status: types.enumeration(['creating', 'processing', 'analyzing', 'open', 'closed', 'merged']),
  createdAt: types.number,
  repo: types.string,
  branch: types.string,
  websiteUrl: types.string,
  changesCount: types.number,
});

// AI Comment Models
const PRScoreBreakdownModel = types.model('PRScoreBreakdown', {
  codeConsistency: types.number,
  reuseScore: types.number,
  aiDetectionRisk: types.number,
  cascadeRisk: types.number,
  responsiveScore: types.number,
  semanticScore: types.number,
  intentAlignment: types.number,
});

const FlagModel = types.model('Flag', {
  type: types.enumeration(['warning', 'suggestion', 'info']),
  message: types.string,
  details: types.maybe(types.string),
  confidence: types.number,
});

const PRScoreModel = types.model('PRScore', {
  overall: types.number,
  breakdown: PRScoreBreakdownModel,
  flags: types.array(FlagModel),
  summary: types.string,
  wouldApprove: types.boolean,
  confidence: types.number,
});

const RiskModel = types.model('Risk', {
  id: types.string,
  severity: types.enumeration(['critical', 'high', 'medium', 'low']),
  category: types.string,
  title: types.string,
  description: types.string,
  affectedBreakpoints: types.maybe(types.array(types.string)),
  mitigation: types.maybe(types.string),
  confidence: types.number,
});

const SuggestionModel = types.model('Suggestion', {
  id: types.string,
  type: types.enumeration(['improvement', 'alternative', 'best-practice', 'optimization']),
  priority: types.enumeration(['high', 'medium', 'low']),
  title: types.string,
  description: types.string,
  codeExample: types.maybe(types.string),
  rationale: types.string,
  confidence: types.number,
});

const ComponentImpactModel = types.model('ComponentImpact', {
  componentName: types.string,
  filePath: types.maybe(types.string),
  impactLevel: types.enumeration(['high', 'medium', 'low']),
  description: types.string,
  otherPagesAffected: types.array(types.string),
  confidence: types.number,
});

const StyleReviewModel = types.model('StyleReview', {
  overallConsistency: types.number,
  designSystemAlignment: types.number,
  colorConsistency: types.number,
  spacingConsistency: types.number,
  typographyConsistency: types.number,
  issues: types.array(types.frozen()),
  confidence: types.number,
});

const AICommentModel = types.model('AIComment', {
  id: types.identifier,
  changeId: types.string,
  timestamp: types.number,
  affectedComponents: types.array(ComponentImpactModel),
  risks: types.array(RiskModel),
  suggestions: types.array(SuggestionModel),
  styleConsistency: StyleReviewModel,
  prScore: PRScoreModel,
  confidence: types.number,
  provider: types.enumeration(['openai', 'anthropic']),
  tokensUsed: types.number,
});

// Voice Command History Model
const VoiceCommandHistoryModel = types.model('VoiceCommandHistory', {
  id: types.identifier,
  transcript: types.string,
  interpretation: types.string,
  changes: types.frozen<Array<{
    type: 'style' | 'text';
    elementId?: string;
    elementSelector?: string;
    elementDescription?: string;
    styles?: Record<string, string>;
    text?: string;
  }>>(),
  timestamp: types.number,
  success: types.boolean,
});

// Voice Mode State Model
const VoiceModeModel = types
  .model('VoiceMode', {
    status: types.optional(
      types.enumeration(['idle', 'recording', 'processing', 'applying', 'complete', 'error']),
      'idle'
    ),
    transcript: types.optional(types.string, ''),
    interimTranscript: types.optional(types.string, ''),
    interpretation: types.optional(types.string, ''),
    error: types.maybe(types.string),
    clarificationNeeded: types.maybe(types.string),
    suggestions: types.optional(types.array(types.string), []),
    history: types.array(VoiceCommandHistoryModel),
    isVoiceInputOpen: types.optional(types.boolean, false),
  })
  .actions((self) => ({
    setStatus(status: 'idle' | 'recording' | 'processing' | 'applying' | 'complete' | 'error') {
      self.status = status;
    },
    setTranscript(transcript: string) {
      self.transcript = transcript;
    },
    setInterimTranscript(interimTranscript: string) {
      self.interimTranscript = interimTranscript;
    },
    setInterpretation(interpretation: string) {
      self.interpretation = interpretation;
    },
    setError(error: string | undefined) {
      self.error = error;
      if (error) {
        self.status = 'error';
      }
    },
    setClarificationNeeded(clarification: string | undefined) {
      self.clarificationNeeded = clarification;
    },
    setSuggestions(suggestions: string[]) {
      self.suggestions.replace(suggestions);
    },
    setVoiceInputOpen(open: boolean) {
      self.isVoiceInputOpen = open;
    },
    addToHistory(item: {
      id: string;
      transcript: string;
      interpretation: string;
      changes: Array<{
        type: 'style' | 'text';
        elementId?: string;
        elementSelector?: string;
        elementDescription?: string;
        styles?: Record<string, string>;
        text?: string;
      }>;
      timestamp: number;
      success: boolean;
    }) {
      self.history.unshift(VoiceCommandHistoryModel.create(item));
      // Keep only last 50 items
      if (self.history.length > 50) {
        self.history.pop();
      }
    },
    reset() {
      self.status = 'idle';
      self.transcript = '';
      self.interimTranscript = '';
      self.interpretation = '';
      self.error = undefined;
      self.clarificationNeeded = undefined;
      self.suggestions.clear();
    },
  }));

// UI State Model
const UIStateModel = types
  .model('UIState', {
    activeTab: types.optional(
      types.enumeration(['design', 'changes', 'pullRequests', 'aiComments', 'voice']),
      'design'
    ),
    isLoading: types.optional(types.boolean, false),
    error: types.maybe(types.string),
    isAnalyzing: types.optional(types.boolean, false),
  })
  .actions((self) => ({
    setActiveTab(tab: 'design' | 'changes' | 'pullRequests' | 'aiComments' | 'voice') {
      self.activeTab = tab;
    },
    setLoading(loading: boolean) {
      self.isLoading = loading;
    },
    setError(error: string | undefined) {
      self.error = error;
    },
    setAnalyzing(analyzing: boolean) {
      self.isAnalyzing = analyzing;
    },
  }));

// User Model
const UserModel = types.model('User', {
  id: types.identifier,
  name: types.string,
  email: types.string,
  avatarUrl: types.string,
});

// Root Store
export const RootStore = types
  .model('RootStore', {
    selectedElement: types.maybe(ElementModel),
    changes: types.array(ChangeModel),
    repositories: types.array(RepositoryModel),
    branches: types.array(BranchModel),
    currentRepo: types.maybe(types.reference(RepositoryModel)),
    currentBranch: types.maybe(types.string),
    pullRequests: types.array(PullRequestModel),
    aiComments: types.array(AICommentModel),
    user: types.maybe(UserModel),
    ui: types.optional(UIStateModel, {}),
    voiceMode: types.optional(VoiceModeModel, {}),
    currentWebsiteUrl: types.optional(types.string, ''),
  })
  .views((self) => ({
    get changesCount() {
      return self.changes.length;
    },
    get hasChanges() {
      return self.changes.length > 0;
    },
    get openPullRequests() {
      return self.pullRequests.filter((pr) => pr.status === 'open');
    },
    get isAuthenticated() {
      return !!self.user;
    },
    get aiCommentsCount() {
      return self.aiComments.length;
    },
    get hasAIComments() {
      return self.aiComments.length > 0;
    },
    get averagePRScore() {
      if (self.aiComments.length === 0) return 0;
      const sum = self.aiComments.reduce((acc, c) => acc + c.prScore.overall, 0);
      return Math.round(sum / self.aiComments.length);
    },
  }))
  .actions((self) => ({
    setSelectedElement(elementInfo: SnapshotIn<typeof ElementModel> | null) {
      if (elementInfo) {
        self.selectedElement = ElementModel.create(elementInfo);
      } else {
        self.selectedElement = undefined;
      }
    },
    clearSelectedElement() {
      self.selectedElement = undefined;
    },
    addChange(change: SnapshotIn<typeof ChangeModel>) {
      // Check if change already exists for this element
      const existingIndex = self.changes.findIndex(
        (c) => c.elementId === change.elementId && c.type === change.type
      );
      if (existingIndex >= 0) {
        // Update existing change
        self.changes[existingIndex] = ChangeModel.create({
          ...change,
          original: self.changes[existingIndex].original,
        });
      } else {
        self.changes.push(ChangeModel.create(change));
      }
    },
    removeChange(changeId: string) {
      const index = self.changes.findIndex((c) => c.id === changeId);
      if (index >= 0) {
        self.changes.splice(index, 1);
      }
    },
    clearChanges() {
      self.changes.clear();
    },
    setRepositories(repos: SnapshotIn<typeof RepositoryModel>[]) {
      self.repositories.replace(repos.map((r) => RepositoryModel.create(r)));
    },
    setBranches(branches: SnapshotIn<typeof BranchModel>[]) {
      self.branches.replace(branches.map((b) => BranchModel.create(b)));
    },
    setCurrentRepo(repoId: number | undefined) {
      if (repoId) {
        const repo = self.repositories.find((r) => r.id === repoId);
        if (repo) {
          self.currentRepo = repo;
          self.currentBranch = repo.defaultBranch;
        }
      } else {
        self.currentRepo = undefined;
      }
    },
    setCurrentBranch(branch: string) {
      self.currentBranch = branch;
    },
    addPullRequest(pr: SnapshotIn<typeof PullRequestModel>) {
      self.pullRequests.unshift(PullRequestModel.create(pr));
    },
    updatePullRequest(prId: string, updates: Partial<SnapshotIn<typeof PullRequestModel>>) {
      const pr = self.pullRequests.find((p) => p.id === prId);
      if (pr) {
        Object.assign(pr, updates);
      }
    },
    setUser(user: SnapshotIn<typeof UserModel> | undefined) {
      self.user = user ? UserModel.create(user) : undefined;
    },
    setCurrentWebsiteUrl(url: string) {
      self.currentWebsiteUrl = url;
    },
    applyStyleToElement(styles: Record<string, string>) {
      if (!self.selectedElement) return;
      chrome.runtime.sendMessage({
        type: 'APPLY_STYLE',
        payload: {
          elementId: self.selectedElement.id,
          styles,
        },
      });
    },
    applyTextToElement(text: string) {
      if (!self.selectedElement) return;
      chrome.runtime.sendMessage({
        type: 'APPLY_TEXT',
        payload: {
          elementId: self.selectedElement.id,
          text,
        },
      });
    },
    addAIComment(comment: SnapshotIn<typeof AICommentModel>) {
      // Remove existing comment for the same change
      const existingIndex = self.aiComments.findIndex(c => c.changeId === comment.changeId);
      if (existingIndex >= 0) {
        self.aiComments.splice(existingIndex, 1);
      }
      self.aiComments.push(AICommentModel.create(comment));
    },
    removeAIComment(commentId: string) {
      const index = self.aiComments.findIndex(c => c.id === commentId);
      if (index >= 0) {
        self.aiComments.splice(index, 1);
      }
    },
    clearAIComments() {
      self.aiComments.clear();
    },
    // Voice mode actions
    openVoiceInput() {
      self.voiceMode.setVoiceInputOpen(true);
      self.ui.setActiveTab('voice');
    },
    closeVoiceInput() {
      self.voiceMode.setVoiceInputOpen(false);
    },
    applyVoiceChanges(changes: Array<{
      type: 'style' | 'text';
      elementId?: string;
      styles?: Record<string, string>;
      text?: string;
    }>) {
      self.voiceMode.setStatus('applying');
      
      for (const change of changes) {
        const elementId = change.elementId || self.selectedElement?.id;
        if (!elementId) continue;
        
        if (change.type === 'style' && change.styles) {
          chrome.runtime.sendMessage({
            type: 'APPLY_STYLE',
            payload: {
              elementId,
              styles: change.styles,
            },
          });
        } else if (change.type === 'text' && change.text) {
          chrome.runtime.sendMessage({
            type: 'APPLY_TEXT',
            payload: {
              elementId,
              text: change.text,
            },
          });
        }
      }
      
      self.voiceMode.setStatus('complete');
      // Reset to idle after a short delay
      setTimeout(() => {
        if (self.voiceMode.status === 'complete') {
          self.voiceMode.setStatus('idle');
        }
      }, 2000);
    },
  }));

export interface IRootStore extends Instance<typeof RootStore> {}
export interface IRootStoreSnapshotIn extends SnapshotIn<typeof RootStore> {}
export interface IRootStoreSnapshotOut extends SnapshotOut<typeof RootStore> {}
