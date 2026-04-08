import type { CatalogAlias, CatalogSearchResult, InventoryOption, PayerKind, ResolutionState } from '../lib/catalog/types';

export interface SuggestionViewModel {
  id: string;
  result: CatalogSearchResult;
  status: ResolutionState | 'checking' | 'unresolved';
}

export interface DisambiguationModel {
  suggestionId: string;
  entryLabel: string;
  options: InventoryOption[];
}

export interface PanelCallbacks {
  onSuggestionSelected: (suggestionId: string) => void;
  onDisambiguationSelected: (suggestionId: string, optionIndex: number) => void;
  onFallbackSearch: (suggestionId: string) => void;
  onNoticeToggle: () => void;
  onReadMore: () => void;
}

export interface PanelState {
  open: boolean;
  anchorRect: DOMRect | null;
  query: string;
  suggestions: SuggestionViewModel[];
  highlightedIndex: number;
  message: string | null;
  disambiguation: DisambiguationModel | null;
  layout: 'inline' | 'modal';
  payer: PayerKind;
  showPayerBadge: boolean;
  nativeMode: boolean;
  showNotice: boolean;
  noticeExpanded: boolean;
}

interface PanelPlacement {
  top: number;
  left: number;
  width: number;
}

const VIEWPORT_MARGIN = 16;
const MODAL_GAP = 24;
const NOTICE_HELPER_TEXT = 'Alat bantu pencarian obat. Tetap verifikasi sebelum simpan.';
const NOTICE_DETAIL_TEXT =
  'Extension ini membantu pencarian obat pada workflow resep. Hasil tetap harus diverifikasi oleh tenaga kesehatan sebelum disimpan. Gunakan sesuai otorisasi dan SOP fasilitas kesehatan.';

export class LookupPanel {
  private readonly host = document.createElement('div');
  private readonly shadow = this.host.attachShadow({ mode: 'open' });
  private readonly container = document.createElement('div');
  private state: PanelState = {
    open: false,
    anchorRect: null,
    query: '',
    suggestions: [],
    highlightedIndex: 0,
    message: null,
    disambiguation: null,
    layout: 'inline',
    payer: 'unknown',
    showPayerBadge: false,
    nativeMode: false,
    showNotice: true,
    noticeExpanded: false
  };

  constructor(private readonly callbacks: PanelCallbacks) {
    this.host.setAttribute('data-edrug-lookup', 'host');
    this.host.style.position = 'fixed';
    this.host.style.inset = '0';
    this.host.style.pointerEvents = 'none';
    this.host.style.zIndex = '2147483646';
    this.container.className = 'panel';

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      .panel {
        position: fixed;
        z-index: 2147483647;
        min-width: 320px;
        max-width: 520px;
        max-height: min(70vh, 560px);
        border: 1px solid rgba(13, 31, 54, 0.15);
        background: #fffdfa;
        color: #172033;
        border-radius: 14px;
        box-shadow: 0 20px 45px rgba(15, 37, 63, 0.18);
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        overflow: hidden;
        pointer-events: auto;
      }
      .panel[data-hidden="true"] { display: none; }
      .panel[data-layout="modal"] {
        max-width: 380px;
        max-height: min(38vh, 300px);
        box-shadow: 0 16px 32px rgba(15, 37, 63, 0.14);
      }
      .panel[data-layout="modal"] .header {
        padding: 11px 15px;
      }
      .panel[data-layout="modal"] .header-title {
        font-size: 13px;
        letter-spacing: 0.06em;
      }
      .panel[data-layout="modal"] .header-badge {
        font-size: 10.5px;
        padding: 5px 9px;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 14px;
        border-bottom: 1px solid rgba(13, 31, 54, 0.08);
        background: linear-gradient(135deg, #f9f5ed, #fff);
      }
      .header-title {
        min-width: 0;
        flex: 1 1 auto;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: none;
      }
      .header-badge {
        flex: none;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        border: 1px solid transparent;
      }
      .header-badge[data-tone="bpjs"] {
        color: #a32020;
        background: #fde8e8;
        border-color: #f5b6b6;
      }
      .header-badge[data-tone="umum"] {
        color: #1d4ed8;
        background: #e8f0ff;
        border-color: #bfd3ff;
      }
      .header-info {
        all: unset;
        box-sizing: border-box;
        flex: none;
        cursor: pointer;
        padding: 4px 7px;
        border-radius: 999px;
        border: 1px solid rgba(13, 31, 54, 0.12);
        background: #fff;
        color: #445064;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .header-info:hover {
        background: #f4f7fb;
      }
      .header-info[data-expanded="true"] {
        background: #eef6ff;
        color: #0f3b5f;
        border-color: rgba(29, 78, 216, 0.22);
      }
      .body {
        overflow: auto;
        max-height: min(62vh, 500px);
      }
      .panel[data-layout="modal"] .body {
        max-height: min(30vh, 210px);
      }
      .notice {
        padding: 10px 14px 0;
        background: linear-gradient(180deg, rgba(247, 239, 228, 0.52), rgba(255, 255, 255, 0));
      }
      .panel[data-layout="modal"] .notice {
        padding: 8px 15px 0;
      }
      .panel[data-layout="inline"] .notice {
        padding: 8px 12px 0;
      }
      .notice-helper {
        font-size: 11.5px;
        line-height: 1.45;
        color: #5a6678;
      }
      .panel[data-layout="inline"] .notice-helper {
        font-size: 11px;
        line-height: 1.4;
      }
      .panel[data-layout="modal"] .notice-helper {
        font-size: 11px;
      }
      .notice-detail {
        margin-top: 8px;
        padding: 9px 10px;
        border: 1px solid rgba(13, 31, 54, 0.08);
        border-radius: 10px;
        background: #fffaf2;
        color: #445064;
        font-size: 11.5px;
        line-height: 1.5;
      }
      .panel[data-layout="modal"] .notice-detail {
        margin-top: 6px;
        padding: 8px 9px;
        font-size: 11px;
      }
      .notice-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 7px;
        padding-bottom: 8px;
      }
      .panel[data-layout="inline"] .notice-actions {
        padding-bottom: 6px;
      }
      .notice-link {
        all: unset;
        box-sizing: border-box;
        cursor: pointer;
        color: #0f5aa3;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
      }
      .notice-link:hover {
        color: #0a447b;
        text-decoration: underline;
      }
      .panel[data-layout="modal"] .item {
        padding: 13px 15px;
      }
      .panel[data-layout="modal"] .item-title {
        font-size: 15px;
        line-height: 1.35;
      }
      .panel[data-layout="modal"] .item-subtitle {
        margin-top: 4px;
        font-size: 12.5px;
      }
      .panel[data-layout="modal"] .pill {
        font-size: 11.5px;
        padding: 5px 8px;
      }
      .panel[data-layout="modal"] .status {
        font-size: 11.5px;
      }
      .message {
        padding: 14px;
        font-size: 13px;
        line-height: 1.5;
      }
      .native-notice {
        margin: 10px 12px 0;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #1e3a8a;
        font-size: 12px;
        font-weight: 600;
      }
      .item, .disambiguation-item, .fallback-button {
        all: unset;
        display: block;
        box-sizing: border-box;
        width: 100%;
        cursor: pointer;
      }
      .item {
        padding: 12px 14px;
        border-top: 1px solid rgba(13, 31, 54, 0.06);
        background: #fff;
      }
      .item[data-highlighted="true"] {
        background: #eef6ff;
      }
      .item-title {
        font-size: 14px;
        font-weight: 700;
        color: #0f3b5f;
      }
      .item-subtitle {
        margin-top: 3px;
        font-size: 12px;
        color: #4b5563;
      }
      .pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .pill {
        padding: 4px 7px;
        border-radius: 999px;
        font-size: 11px;
        border: 1px solid transparent;
      }
      .pill-source {
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .pill-bpjs {
        background: #fde8e8;
        border-color: #f5b6b6;
        color: #a32020;
      }
      .pill-umum {
        background: #e8f0ff;
        border-color: #bfd3ff;
        color: #1d4ed8;
      }
      .pill-neutral {
        background: #f7efe4;
        border-color: #edd7bc;
        color: #69452a;
      }
      .status {
        margin-top: 8px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .status-ready { color: #0f7a32; }
      .status-multiple { color: #9a5b00; }
      .status-no-match { color: #9b1c1c; }
      .status-checking { color: #465569; }
      .status-unresolved { color: #6b7280; }
      .disambiguation {
        border-top: 1px solid rgba(13, 31, 54, 0.08);
        background: #fffaf2;
        padding: 10px;
      }
      .disambiguation-title {
        font-size: 12px;
        color: #5b6472;
        margin-bottom: 8px;
      }
      .disambiguation-item {
        padding: 8px 10px;
        margin-bottom: 6px;
        background: #fff;
        border: 1px solid rgba(13, 31, 54, 0.08);
        border-radius: 10px;
        font-size: 12px;
      }
      .fallback-button {
        margin-top: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        background: #173f68;
        color: #ffffff;
        text-align: center;
        font-size: 12px;
        font-weight: 600;
      }
    `;

    this.shadow.append(style, this.container);
    document.documentElement.appendChild(this.host);
  }

  destroy(): void {
    this.host.remove();
  }

  containsTarget(target: EventTarget | null): boolean {
    return target instanceof Node && (this.host.contains(target) || this.shadow.contains(target));
  }

  render(state: PanelState): void {
    this.state = state;
    this.container.dataset.hidden = String(!state.open);
    this.container.dataset.layout = state.layout;
    if (!state.open || !state.anchorRect) {
      return;
    }

    const initialPlacement =
      state.layout === 'modal'
        ? computeModalPlacement(state.anchorRect, window.innerWidth, window.innerHeight)
        : computeInlinePlacement(state.anchorRect, window.innerWidth, window.innerHeight);

    this.container.style.left = `${initialPlacement.left}px`;
    this.container.style.width = `${initialPlacement.width}px`;
    this.container.style.top = `${initialPlacement.top}px`;
    this.container.replaceChildren(this.renderHeader(), this.renderBody());

    const finalPlacement =
      state.layout === 'modal'
        ? initialPlacement
        : computeInlinePlacement(
            state.anchorRect,
            window.innerWidth,
            window.innerHeight,
            Math.ceil(this.container.getBoundingClientRect().height)
          );

    this.container.style.top = `${finalPlacement.top}px`;
    this.container.style.left = `${finalPlacement.left}px`;
    this.container.style.width = `${finalPlacement.width}px`;
  }

  private renderHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'header';

    const title = document.createElement('div');
    title.className = 'header-title';
    title.textContent = this.state.query ? `eDrugLookup - ${this.state.query}` : 'eDrugLookup';
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'header-actions';

    const infoButton = document.createElement('button');
    infoButton.type = 'button';
    infoButton.className = 'header-info';
    infoButton.dataset.expanded = String(this.state.noticeExpanded);
    infoButton.title = this.state.noticeExpanded ? 'Hide legal notice' : 'Show legal notice';
    infoButton.setAttribute('aria-label', infoButton.title);
    infoButton.textContent = 'Info';
    infoButton.addEventListener('mousedown', (event) => event.preventDefault());
    infoButton.addEventListener('click', () => this.callbacks.onNoticeToggle());
    actions.appendChild(infoButton);

    const payerTone = getPillTone(this.state.payer);
    if (this.state.showPayerBadge && payerTone !== 'neutral') {
      const badge = document.createElement('div');
      badge.className = 'header-badge';
      badge.dataset.tone = payerTone;
      badge.textContent = `${formatPayer(this.state.payer)} priority`;
      actions.appendChild(badge);
    }

    header.appendChild(actions);
    return header;
  }

  private renderBody(): HTMLElement {
    const body = document.createElement('div');
    body.className = 'body';

    if (this.state.nativeMode) {
      const notice = document.createElement('div');
      notice.className = 'native-notice';
      notice.textContent = 'Katalog lokal tidak tersedia, menggunakan mode native.';
      body.appendChild(notice);
    }

    if (this.state.showNotice) {
      body.appendChild(this.renderNotice());
    }

    if (this.state.message) {
      const message = document.createElement('div');
      message.className = 'message';
      message.textContent = this.state.message;
      body.appendChild(message);
      return body;
    }

    for (const [index, suggestion] of this.state.suggestions.entries()) {
      body.appendChild(this.renderSuggestion(suggestion, index));
    }

    if (this.state.disambiguation) {
      body.appendChild(this.renderDisambiguation(this.state.disambiguation));
    }

    return body;
  }

  private renderNotice(): HTMLElement {
    const notice = document.createElement('div');
    notice.className = 'notice';

    const helper = document.createElement('div');
    helper.className = 'notice-helper';
    helper.textContent = NOTICE_HELPER_TEXT;
    notice.appendChild(helper);

    if (this.state.noticeExpanded) {
      const detail = document.createElement('div');
      detail.className = 'notice-detail';
      detail.textContent = NOTICE_DETAIL_TEXT;
      notice.appendChild(detail);
    }

    const actions = document.createElement('div');
    actions.className = 'notice-actions';

    const readMore = document.createElement('button');
    readMore.type = 'button';
    readMore.className = 'notice-link';
    readMore.textContent = 'Read more';
    readMore.addEventListener('mousedown', (event) => event.preventDefault());
    readMore.addEventListener('click', () => this.callbacks.onReadMore());
    actions.appendChild(readMore);

    notice.appendChild(actions);
    return notice;
  }

  private renderSuggestion(suggestion: SuggestionViewModel, index: number): HTMLElement {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'item';
    item.dataset.highlighted = String(index === this.state.highlightedIndex);
    item.addEventListener('mousedown', (event) => event.preventDefault());
    item.addEventListener('click', () => this.callbacks.onSuggestionSelected(suggestion.id));

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = suggestion.result.alias.name;

    const subtitle = document.createElement('div');
    subtitle.className = 'item-subtitle';
    subtitle.textContent = `${suggestion.result.entry.kandungan} - ${suggestion.result.entry.sediaan}`;

    const pills = document.createElement('div');
    pills.className = 'pill-row';

    pills.appendChild(createSourcePill(suggestion.result.alias));

    const siblingAliases = suggestion.result.entry.aliases.filter((alias) => alias.id !== suggestion.result.alias.id);
    for (const alias of siblingAliases) {
      pills.appendChild(createAliasPill(alias));
    }

    const status = document.createElement('div');
    status.className = `status status-${suggestion.status}`;
    status.textContent = formatStatus(suggestion.status);

    item.append(title, subtitle, pills, status);
    return item;
  }

  private renderDisambiguation(model: DisambiguationModel): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'disambiguation';

    const title = document.createElement('div');
    title.className = 'disambiguation-title';
    title.textContent = model.options.length
      ? `Choose the live inventory item for ${model.entryLabel}`
      : `No live inventory match found for ${model.entryLabel}`;
    wrapper.appendChild(title);

    model.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'disambiguation-item';
      button.textContent = option.label ?? option.value ?? option.id;
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => this.callbacks.onDisambiguationSelected(model.suggestionId, index));
      wrapper.appendChild(button);
    });

    const fallback = document.createElement('button');
    fallback.type = 'button';
    fallback.className = 'fallback-button';
    fallback.textContent = 'Search native field instead';
    fallback.addEventListener('mousedown', (event) => event.preventDefault());
    fallback.addEventListener('click', () => this.callbacks.onFallbackSearch(model.suggestionId));
    wrapper.appendChild(fallback);

    return wrapper;
  }
}

export function computeModalPlacement(anchorRect: DOMRect, viewportWidth: number, viewportHeight: number): PanelPlacement {
  const maxWidth = Math.max(260, viewportWidth - VIEWPORT_MARGIN * 2);
  const width = Math.min(maxWidth, Math.max(320, Math.round(Math.min(380, anchorRect.width * 0.4))));
  const preferredTop = anchorRect.bottom + MODAL_GAP;
  const fallbackTop = anchorRect.top + Math.min(96, Math.max(32, anchorRect.height * 0.18));
  const top = preferredTop + 220 <= viewportHeight - VIEWPORT_MARGIN ? preferredTop : fallbackTop;
  const centeredLeft = anchorRect.left + anchorRect.width / 2 - width / 2;

  return {
    top: clamp(Math.round(top), VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportHeight - 240)),
    left: clamp(Math.round(centeredLeft), VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN)),
    width
  };
}

export function computeInlinePlacement(
  anchorRect: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
  panelHeight = 0
): PanelPlacement {
  const width = Math.min(Math.max(240, viewportWidth - 24), Math.min(520, Math.max(320, anchorRect.width)));
  const preferredTop = anchorRect.bottom + 8;
  const maxTop = Math.max(12, viewportHeight - panelHeight - 12);
  return {
    top: clamp(Math.min(preferredTop, maxTop), 12, Math.max(12, viewportHeight - MODAL_GAP)),
    left: Math.max(12, Math.min(anchorRect.left, viewportWidth - width - 12)),
    width
  };
}

export function getPillTone(source: string): 'bpjs' | 'umum' | 'neutral' {
  const normalizedSource = source.trim().toUpperCase();
  if (normalizedSource === 'BPJS') {
    return 'bpjs';
  }
  if (normalizedSource === 'UMUM') {
    return 'umum';
  }
  return 'neutral';
}

function createAliasPill(alias: CatalogAlias): HTMLElement {
  const pill = document.createElement('div');
  const toneSource = alias.source === 'Kandungan' ? 'Neutral' : alias.source;
  pill.className = `pill pill-${getPillTone(toneSource)}`;
  pill.textContent = `${alias.source}: ${alias.name}`;
  return pill;
}

function createSourcePill(alias: CatalogAlias): HTMLElement {
  const toneSource = alias.source === 'Kandungan' ? 'Neutral' : alias.source;
  const pill = document.createElement('div');
  pill.className = `pill pill-source pill-${getPillTone(toneSource)}`;
  pill.textContent = alias.source;
  return pill;
}

function formatStatus(status: SuggestionViewModel['status']): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'multiple':
      return 'Multiple matches';
    case 'no-match':
      return 'No live match';
    case 'unresolved':
      return 'Click to resolve';
    default:
      return 'Checking';
  }
}

function formatPayer(payer: PayerKind): string {
  switch (payer) {
    case 'bpjs':
      return 'BPJS';
    case 'umum':
      return 'Umum';
    default:
      return '';
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
