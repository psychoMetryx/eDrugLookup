import type { InventoryOption } from '../lib/catalog/types';

export const BRIDGE_REQUEST_EVENT = 'edruglookup:bridge-request';
export const BRIDGE_RESPONSE_EVENT = 'edruglookup:bridge-response';

export type BridgeAction =
  | 'probe'
  | 'probeModal'
  | 'searchInventory'
  | 'selectInventory'
  | 'primeSearch'
  | 'searchModalInventory'
  | 'selectModalInventory'
  | 'primeModalSearch';

export interface BridgeRequestMap {
  probe: undefined;
  probeModal: undefined;
  searchInventory: { term: string };
  selectInventory: { option: InventoryOption };
  primeSearch: { term: string };
  searchModalInventory: { term: string; searchType?: string; syncInput?: boolean };
  selectModalInventory: { option: InventoryOption };
  primeModalSearch: { term: string; searchType?: string; syncInput?: boolean };
}

export interface BridgeResponseMap {
  probe: {
    supported: boolean;
    status: 'non-racik' | 'modal-open' | 'inactive' | 'missing-vue' | 'missing-field';
    hasVueBridge: boolean;
    activeMode: 'inline-non-racik' | 'modal-cari-obat' | 'inactive';
  };
  probeModal: {
    supported: boolean;
    status: 'modal-open' | 'missing-modal' | 'missing-vue';
    hasVueBridge: boolean;
  };
  searchInventory: {
    options: InventoryOption[];
  };
  selectInventory: {
    selectedLabel: string | null;
  };
  primeSearch: {
    ok: boolean;
  };
  searchModalInventory: {
    options: InventoryOption[];
  };
  selectModalInventory: {
    selectedLabel: string | null;
  };
  primeModalSearch: {
    ok: boolean;
  };
}

export interface BridgeEnvelope<TAction extends BridgeAction> {
  id: string;
  action: TAction;
  payload: BridgeRequestMap[TAction];
}

export interface BridgeResponseEnvelope<TAction extends BridgeAction> {
  id: string;
  action: TAction;
  ok: boolean;
  payload?: BridgeResponseMap[TAction];
  error?: string;
}
