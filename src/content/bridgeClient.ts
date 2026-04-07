import {
  BRIDGE_REQUEST_EVENT,
  BRIDGE_RESPONSE_EVENT,
  type BridgeAction,
  type BridgeEnvelope,
  type BridgeRequestMap,
  type BridgeResponseEnvelope,
  type BridgeResponseMap
} from './bridgeProtocol';

export class PageBridgeClient {
  private readonly pending = new Map<string, { resolve: (value: any) => void; reject: (reason?: unknown) => void }>();

  constructor() {
    window.addEventListener(BRIDGE_RESPONSE_EVENT, this.handleResponse as EventListener);
  }

  dispose(): void {
    window.removeEventListener(BRIDGE_RESPONSE_EVENT, this.handleResponse as EventListener);
    for (const pending of this.pending.values()) {
      pending.reject(new Error('Bridge client disposed.'));
    }
    this.pending.clear();
  }

  request<TAction extends BridgeAction>(
    action: TAction,
    payload: BridgeRequestMap[TAction]
  ): Promise<BridgeResponseMap[TAction]> {
    const id = `edruglookup-${crypto.randomUUID()}`;
    const envelope: BridgeEnvelope<TAction> = { id, action, payload };

    return new Promise<BridgeResponseMap[TAction]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      window.dispatchEvent(new CustomEvent(BRIDGE_REQUEST_EVENT, { detail: envelope }));
      window.setTimeout(() => {
        if (!this.pending.has(id)) {
          return;
        }
        this.pending.delete(id);
        reject(new Error(`Bridge request timed out for action "${action}".`));
      }, 4_000);
    });
  }

  private readonly handleResponse = (event: CustomEvent<BridgeResponseEnvelope<BridgeAction>>): void => {
    const detail = event.detail;
    if (!detail || !this.pending.has(detail.id)) {
      return;
    }

    const pending = this.pending.get(detail.id);
    this.pending.delete(detail.id);
    if (!pending) {
      return;
    }

    if (!detail.ok) {
      pending.reject(new Error(detail.error ?? 'Unknown bridge error.'));
      return;
    }

    pending.resolve(detail.payload);
  };
}
