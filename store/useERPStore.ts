import { create } from 'zustand';
import { Customer, InventoryItem, Invoice, Account } from '../types';

interface ERPState {
  customers: Customer[];
  items: InventoryItem[];
  invoices: Invoice[];
  quotes: any[];
  orders: any[];
  deliveryNotes: any[];
  accounts: Account[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCustomers: () => Promise<void>;
  fetchItems: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  fetchQuotes: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchDeliveryNotes: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchAllData: () => Promise<void>;
  
  createCustomer: (customer: any) => Promise<void>;
  createInvoice: (invoice: any) => Promise<void>;
  createQuote: (quote: any) => Promise<void>;
  createOrder: (order: any) => Promise<void>;
  createDeliveryNote: (note: any) => Promise<void>;
  getNextReference: (type: string) => Promise<string>;
}

import { getApiBaseUrl } from '../utils/apiConfig';

const API_BASE = getApiBaseUrl();

export const useERPStore = create<ERPState>((set, get) => ({
  customers: [],
  items: [],
  invoices: [],
  quotes: [],
  orders: [],
  deliveryNotes: [],
  accounts: [],
  isLoading: false,
  error: null,

  createCustomer: async (customerData) => {
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      if (res.ok) {
        await get().fetchCustomers();
      }
    } catch (err) {
      set({ error: 'Failed to create customer' });
    }
  },

  createInvoice: async (data) => {
      try {
          const res = await fetch(`${API_BASE}/invoices`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          });
          if (res.ok) await get().fetchInvoices();
      } catch (err) {
          set({ error: 'Failed to create invoice' });
      }
  },

  createQuote: async (data) => {
      try {
          const res = await fetch(`${API_BASE}/quotes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          });
          if (res.ok) await get().fetchQuotes();
      } catch (err) {
          set({ error: 'Failed to create quote' });
      }
  },

  createOrder: async (data) => {
      try {
          const res = await fetch(`${API_BASE}/orders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          });
          if (res.ok) await get().fetchOrders();
      } catch (err) {
          set({ error: 'Failed to create order' });
      }
  },

  createDeliveryNote: async (data) => {
      try {
          const res = await fetch(`${API_BASE}/delivery-notes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          });
          if (res.ok) await get().fetchDeliveryNotes();
      } catch (err) {
          set({ error: 'Failed to create delivery note' });
      }
  },

  getNextReference: async (type) => {
      try {
          const res = await fetch(`${API_BASE}/reference/next/${type}`);
          const data = await res.json();
          return data.nextRef;
      } catch (err) {
          return 'REF-ERROR';
      }
  },

  fetchCustomers: async () => {
    try {
      const res = await fetch(`${API_BASE}/customers`);
      const data = await res.json();
      set({ customers: data });
    } catch (err) {
      console.error('Fetch customers failed:', err);
      // Don't set error state yet to avoid blanking screen
    }
  },

  fetchItems: async () => {
    try {
      const res = await fetch(`${API_BASE}/items`);
      const data = await res.json();
      set({ items: data });
    } catch (err) {
      console.error('Fetch items failed:', err);
    }
  },

  fetchInvoices: async () => {
    try {
      const res = await fetch(`${API_BASE}/invoices`);
      const rawData = await res.json();
      const mappedData = rawData.map((inv: any) => ({
        ...inv,
        customer: inv.customer?.name || 'Unknown Customer',
        issueDate: inv.issueDate || new Date(inv.createdAt).toLocaleDateString('en-GB').replace(/\//g, '.'),
        invoiceAmount: parseFloat(inv.grandTotal) || 0,
        balanceDue: parseFloat(inv.balanceDue) || 0,
        status: inv.status || (inv.balanceDue === 0 ? 'Paid' : 'Unpaid'),
        items: inv.items?.map((item: any) => ({
            ...item,
            item: item.item?.itemName || 'Unknown Item',
            unitPrice: item.unitPrice.toString(),
            qty: item.qty.toString()
        }))
      }));
      set({ invoices: mappedData });
    } catch (err) {
      console.error('Fetch invoices failed:', err);
    }
  },

  fetchQuotes: async () => {
      try {
          const res = await fetch(`${API_BASE}/quotes`);
          const rawData = await res.json();
          const mappedData = rawData.map((q: any) => ({
              ...q,
              customer: q.customer?.name || 'Unknown',
              issueDate: q.issueDate || new Date(q.createdAt).toLocaleDateString('en-GB').replace(/\//g, '.'),
              amount: parseFloat(q.amount) || 0,
              items: q.items?.map((item: any) => ({
                  ...item,
                  item: item.item?.itemName || 'Unknown Item',
                  unitPrice: item.unitPrice.toString(),
                  qty: item.qty.toString()
              }))
          }));
          set({ quotes: mappedData });
      } catch (err) {
          console.error('Fetch quotes failed:', err);
      }
  },

  fetchOrders: async () => {
      try {
          const res = await fetch(`${API_BASE}/orders`);
          const rawData = await res.json();
          const mappedData = rawData.map((o: any) => ({
              ...o,
              customer: o.customer?.name || 'Unknown',
              orderDate: o.orderDate || new Date(o.createdAt).toLocaleDateString('en-GB').replace(/\//g, '.'),
              amount: parseFloat(o.amount) || 0,
              items: o.items?.map((item: any) => ({
                ...item,
                item: item.item?.itemName || 'Unknown Item',
                unitPrice: item.unitPrice.toString(),
                qty: item.qty.toString()
            }))
          }));
          set({ orders: mappedData });
      } catch (err) {
          console.error('Fetch orders failed:', err);
      }
  },

  fetchDeliveryNotes: async () => {
      try {
          const res = await fetch(`${API_BASE}/delivery-notes`);
          const rawData = await res.json();
          const mappedData = rawData.map((dn: any) => ({
              ...dn,
              customer: dn.customer?.name || 'Unknown',
              deliveryDate: dn.deliveryDate || new Date(dn.timestamp).toLocaleDateString('en-GB').replace(/\//g, '.'),
              items: dn.items?.map((item: any) => ({
                ...item,
                item: item.item?.itemName || 'Unknown Item',
                qty: item.qty.toString()
            }))
          }));
          set({ deliveryNotes: mappedData });
      } catch (err) {
          console.error('Fetch delivery notes failed:', err);
      }
  },

  fetchAccounts: async () => {
    try {
      const res = await fetch(`${API_BASE}/accounts`);
      const data = await res.json();
      set({ accounts: data });
    } catch (err) {
      console.error('Fetch accounts failed:', err);
    }
  },

  fetchAllData: async () => {
    set({ isLoading: true, error: null });
    try {
        await Promise.all([
            get().fetchCustomers(),
            get().fetchItems(),
            get().fetchInvoices(),
            get().fetchQuotes(),
            get().fetchOrders(),
            get().fetchDeliveryNotes(),
            get().fetchAccounts(),
        ]);
    } catch (err) {
        // Fallback for connectivity issues
    }
    set({ isLoading: false });
  }
}));
