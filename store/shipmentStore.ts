import { create } from 'zustand';
import { Shipment } from '../types';

interface ShipmentState {
  shipments: Shipment[];
  isLoading: boolean;
  error: string | null;

  fetchShipments: () => Promise<void>;
  createShipment: (shipment: any) => Promise<void>;
  updateShipment: (id: string, shipment: any) => Promise<void>;
}

import { getApiBaseUrl } from '../utils/apiConfig';

const API_BASE = `${getApiBaseUrl()}/procurement`;

export const useShipmentStore = create<ShipmentState>((set, get) => ({
  shipments: [],
  isLoading: false,
  error: null,

  fetchShipments: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch(`${API_BASE}/shipments`);
      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }
      const data = await res.json();
      set({ shipments: data, isLoading: false });
    } catch (err) {
      console.error('Fetch shipments failed:', err);
      set({ error: 'Failed to fetch shipments', isLoading: false, shipments: [] });
    }
  },

  createShipment: async (data) => {
    try {
      const res = await fetch(`${API_BASE}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) await get().fetchShipments();
      else set({ error: 'Failed to create shipment' });
    } catch (err) {
      set({ error: 'Failed to create shipment' });
    }
  },

  updateShipment: async (id, data) => {
    try {
      const res = await fetch(`${API_BASE}/shipments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) await get().fetchShipments();
      else set({ error: 'Failed to update shipment' });
    } catch (err) {
      set({ error: 'Failed to update shipment' });
    }
  }
}));
