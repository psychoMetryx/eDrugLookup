import { catalogEntries } from '../generated/catalog';
import { buildCandidateTerms, resolveInventoryMatch } from '../lib/catalog/resolve';
import { searchCatalog } from '../lib/catalog/search';
import type {
  CatalogSearchResult,
  InventoryOption,
  PayerInference,
  ResolutionResult,
  ResolutionState
} from '../lib/catalog/types';
import { PageBridgeClient } from './bridgeClient';
import { injectPageBridge } from './pageBridge';
import { inferPatientPayerInfo } from './payer';
import { getLookupAvailability, isLookupKeyboardTarget, type LookupAvailability, type LookupContext } from './pageState';
import { LookupPanel, type DisambiguationModel, type PanelState, type SuggestionViewModel } from './ui';

interface ResolutionCacheEntry {
  state: ResolutionState;
  options: InventoryOption[];
}

type BridgeAdapter = Pick<PageBridgeClient, 'dispose' | 'request'>;

interface ControllerDependencies {
  bridge?: BridgeAdapter;
  injectPageBridge?: () => void;
}

export class DrugLookupController {
  private readonly bridge: BridgeAdapter;
  private readonly panel: LookupPanel;
  private readonly injectPageBridge: () => void;
  private readonly resolutionCache = new Map<string, ResolutionCacheEntry>();
  private readonly resultsById = new Map<string, CatalogSearchResult>();
  private availability: LookupAvailability = getLookupAvailability();
  private inputListenerAbort: AbortController | null = null;
  private observer: MutationObserver | null = null;
  private closeTimer: number | null = null;
  private disambiguation: DisambiguationModel | null = null;
  private highlightedIndex = 0;
  private isPanelOpen = false;
  private lastQuery = '';
  private queryVersion = 0;
  private payerInfo: PayerInference = inferPatientPayerInfo();

  constructor(dependencies: ControllerDependencies = {}) {
    this.bridge = dependencies.bridge ?? new PageBridgeClient();
    this.injectPageBridge = dependencies.injectPageBridge ?? injectPageBridge;
    this.panel = new LookupPanel({
      onSuggestionSelected: (entryId) => {
        void this.handleSuggestionSelection(entryId);
      },
      onDisambiguationSelected: (entryId, optionIndex) => {
        void this.handleDisambiguationSelection(entryId, optionIndex);
      },
      onFallbackSearch: (entryId) => {
        void this.handleFallbackSearch(entryId);
      }
    });
  }

  start(): void {
    this.injectPageBridge();
    this.bindCurrentContext();
    this.observer = new MutationObserver(() => {
      const nextAvailability = getLookupAvailability();
      const nextPayer = inferPatientPayerInfo();
      if (this.hasContextChanged(nextAvailability) || nextPayer.kind !== this.payerInfo.kind || nextPayer.rawValue !== this.payerInfo.rawValue) {
        this.availability = nextAvailability;
        this.payerInfo = nextPayer;
        this.bindCurrentContext();
        if (this.isPanelOpen) {
          this.render({});
        }
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  stop(): void {
    this.observer?.disconnect();
    this.inputListenerAbort?.abort();
    this.bridge.dispose();
    this.panel.destroy();
  }

  private bindCurrentContext(): void {
    this.inputListenerAbort?.abort();
    this.inputListenerAbort = null;

    const availability = getLookupAvailability();
    this.availability = availability;
    this.payerInfo = inferPatientPayerInfo();
    if (!availability.active || !availability.context) {
      this.closePanel();
      return;
    }

    const abortController = new AbortController();
    const context = availability.context;
    this.inputListenerAbort = abortController;

    context.input.addEventListener(
      'focus',
      () => {
        this.openPanel();
        void this.updateQuery(context.input.value);
      },
      { signal: abortController.signal }
    );

    context.input.addEventListener(
      'input',
      () => {
        this.openPanel();
        void this.updateQuery(context.input.value);
      },
      { signal: abortController.signal }
    );

    context.input.addEventListener('keydown', (event) => this.onInputKeyDown(event), { signal: abortController.signal });

    context.root.addEventListener(
      'focusout',
      () => {
        if (this.closeTimer !== null) {
          window.clearTimeout(this.closeTimer);
        }
        this.closeTimer = window.setTimeout(() => this.closePanel(), 150);
      },
      { signal: abortController.signal }
    );

    context.root.addEventListener(
      'focusin',
      () => {
        if (this.closeTimer !== null) {
          window.clearTimeout(this.closeTimer);
          this.closeTimer = null;
        }
      },
      { signal: abortController.signal }
    );

    document.addEventListener(
      'click',
      (event) => {
        if (!isLookupKeyboardTarget(event.target, availability.context) && !this.panel.containsTarget(event.target)) {
          this.closePanel();
        }
      },
      { signal: abortController.signal, capture: true }
    );

    if (document.activeElement === context.input) {
      this.openPanel();
      void this.updateQuery(context.input.value);
    }
  }

  private hasContextChanged(nextAvailability: LookupAvailability): boolean {
    const currentContext = this.availability.context;
    const nextContext = nextAvailability.context;
    if (this.availability.reason !== nextAvailability.reason || this.availability.mode !== nextAvailability.mode) {
      return true;
    }

    return currentContext?.input !== nextContext?.input || currentContext?.root !== nextContext?.root;
  }

  private async updateQuery(query: string): Promise<void> {
    const version = ++this.queryVersion;
    this.lastQuery = query;
    this.resultsById.clear();
    this.disambiguation = null;
    this.highlightedIndex = 0;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      this.render({
        message: 'Type a generic or brand name to search the bundled drug catalog.'
      });
      return;
    }

    const results = searchCatalog(catalogEntries, trimmedQuery, 8);
    results.forEach((result) => {
      this.resultsById.set(result.alias.id, result);
    });

    if (!results.length) {
      this.render({
        message: 'No catalog match found for this query.'
      });
      return;
    }

    this.render({ suggestions: results });
    if (this.availability.context?.mode !== 'modal-cari-obat') {
      void this.refreshResolutionStatuses(results.slice(0, 5), version);
    }
  }

  private async refreshResolutionStatuses(results: CatalogSearchResult[], version: number): Promise<void> {
    await Promise.all(
      results.map(async (result) => {
        const cacheKey = this.getResolutionCacheKey(result.alias.id);
        if (this.resolutionCache.has(cacheKey)) {
          return;
        }

        const resolution = await this.resolveSuggestion(result);
        if (version !== this.queryVersion) {
          return;
        }

        this.resolutionCache.set(cacheKey, {
          state: resolution.state,
          options: resolution.rankedMatches
        });

        if (this.isPanelOpen && this.lastQuery) {
          this.render({ suggestions: Array.from(this.resultsById.values()) });
        }
      })
    );
  }

  private async resolveSuggestion(result: CatalogSearchResult): Promise<ResolutionResult> {
    const terms = buildCandidateTerms(result.entry, this.payerInfo.kind, result.alias);
    let bestResolution: ResolutionResult = { state: 'no-match', bestMatch: null, rankedMatches: [] };

    for (const term of terms) {
      const response =
        this.availability.context?.mode === 'modal-cari-obat'
          ? await this.bridge.request('searchModalInventory', { term, searchType: 'nama_obat', syncInput: false })
          : await this.bridge.request('searchInventory', { term });
      const resolution = resolveInventoryMatch(result.entry, response.options, this.payerInfo.kind, result.alias);
      if (resolution.state === 'ready') {
        return resolution;
      }
      if (resolution.state === 'multiple') {
        bestResolution = resolution;
      }
    }

    return bestResolution;
  }

  private async handleSuggestionSelection(entryId: string): Promise<void> {
    const result = this.resultsById.get(entryId);
    if (!result) {
      return;
    }

    const cacheKey = this.getResolutionCacheKey(entryId);
    const cached = this.resolutionCache.get(cacheKey);
    let resolution: ResolutionResult;
    if (cached) {
      resolution = {
        state: cached.state,
        bestMatch: cached.state === 'ready' ? cached.options[0] ?? null : null,
        rankedMatches: cached.options
      };
    } else {
      resolution = await this.resolveSuggestion(result);
      this.resolutionCache.set(cacheKey, {
        state: resolution.state,
        options: resolution.rankedMatches
      });
    }

    if (resolution.state === 'ready' && resolution.bestMatch) {
      await this.selectResolvedOption(resolution.bestMatch);
      this.closePanel();
      return;
    }

    if (resolution.state === 'multiple') {
      this.disambiguation = {
        suggestionId: entryId,
        entryLabel: result.alias.name,
        options: resolution.rankedMatches.slice(0, 6)
      };
      this.render({ suggestions: Array.from(this.resultsById.values()) });
      return;
    }

    this.disambiguation = {
      suggestionId: entryId,
      entryLabel: result.alias.name,
      options: []
    };
    this.render({ suggestions: Array.from(this.resultsById.values()) });
  }

  private async handleDisambiguationSelection(suggestionId: string, optionIndex: number): Promise<void> {
    const cache = this.resolutionCache.get(this.getResolutionCacheKey(suggestionId));
    const option = cache?.options?.[optionIndex];
    if (!option) {
      return;
    }

    await this.selectResolvedOption(option);
    this.closePanel();
  }

  private async handleFallbackSearch(suggestionId: string): Promise<void> {
    const result = this.resultsById.get(suggestionId);
    if (!result) {
      return;
    }

    const primaryTerm = buildCandidateTerms(result.entry, this.payerInfo.kind, result.alias)[0] ?? result.alias.name;
    const context = this.availability.context;
    if (context) {
      context.input.value = primaryTerm;
      if (context.mode !== 'modal-cari-obat') {
        context.input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    if (context?.mode === 'modal-cari-obat') {
      await this.bridge.request('primeModalSearch', { term: primaryTerm, searchType: 'nama_obat', syncInput: true });
    } else {
      await this.bridge.request('primeSearch', { term: primaryTerm });
    }

    this.closePanel();
  }

  private async selectResolvedOption(option: InventoryOption): Promise<void> {
    if (this.availability.context?.mode === 'modal-cari-obat') {
      await this.bridge.request('selectModalInventory', { option });
      return;
    }

    await this.bridge.request('selectInventory', { option });
  }

  private onInputKeyDown(event: KeyboardEvent): void {
    if (!this.isPanelOpen || !this.availability.context) {
      return;
    }

    if (event.key === 'Escape') {
      if (this.availability.context.mode === 'inline-non-racik') {
        event.preventDefault();
      }
      this.closePanel();
      return;
    }

    if (this.availability.context.mode === 'modal-cari-obat') {
      return;
    }

    const results = Array.from(this.resultsById.values());
    if (!results.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = Math.min(results.length - 1, this.highlightedIndex + 1);
      this.render({ suggestions: results });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = Math.max(0, this.highlightedIndex - 1);
      this.render({ suggestions: results });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const suggestion = results[this.highlightedIndex];
      if (suggestion) {
        void this.handleSuggestionSelection(suggestion.alias.id);
      }
    }
  }

  private openPanel(): void {
    this.isPanelOpen = true;
    this.render({
      suggestions: Array.from(this.resultsById.values())
    });
  }

  private closePanel(): void {
    this.isPanelOpen = false;
    this.disambiguation = null;
    this.panel.render({
      ...this.getBasePanelState(),
      open: false,
      anchorRect: null,
      suggestions: [],
      highlightedIndex: 0,
      message: null,
      disambiguation: null
    });
  }

  private render({
    suggestions = Array.from(this.resultsById.values()),
    message = null
  }: {
    suggestions?: CatalogSearchResult[];
    message?: string | null;
  }): void {
    const context = this.availability.context;
    const suggestionModels: SuggestionViewModel[] = suggestions.map((result) => ({
      id: result.alias.id,
      result,
      status: this.getResolutionState(result.alias.id)
    }));

    this.panel.render({
      ...this.getBasePanelState(),
      open: this.isPanelOpen,
      anchorRect: this.getAnchorRect(context),
      suggestions: suggestionModels,
      highlightedIndex: this.highlightedIndex,
      message,
      disambiguation: this.disambiguation
    });
  }

  private getBasePanelState(): Omit<PanelState, 'anchorRect' | 'suggestions' | 'highlightedIndex' | 'message' | 'disambiguation' | 'open'> {
    return {
      query: this.lastQuery,
      layout: this.availability.context?.mode === 'modal-cari-obat' ? 'modal' : 'inline',
      payer: this.payerInfo.kind,
      showPayerBadge: this.payerInfo.confidence === 'exact' && this.payerInfo.kind !== 'unknown'
    };
  }

  private getAnchorRect(context: LookupContext | null): DOMRect | null {
    if (!context) {
      return null;
    }

    return context.mode === 'modal-cari-obat'
      ? (context.dialog ?? context.modal).getBoundingClientRect()
      : context.root.getBoundingClientRect();
  }

  private getResolutionState(entryId: string): SuggestionViewModel['status'] {
    if (this.availability.context?.mode === 'modal-cari-obat' && !this.resolutionCache.has(this.getResolutionCacheKey(entryId))) {
      return 'unresolved';
    }

    const cache = this.resolutionCache.get(this.getResolutionCacheKey(entryId));
    if (!cache) {
      return 'checking';
    }

    return cache.state;
  }

  private getResolutionCacheKey(entryId: string): string {
    return `${this.availability.mode}:${this.payerInfo.kind}:${entryId}`;
  }
}
