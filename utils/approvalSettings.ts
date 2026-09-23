const KEY = 'mahant.approvalSettings';

export type ApprovalSettings = {
  quotesRequireApproval: boolean;
  enableStockApproval: boolean;
  enablePriceApproval: boolean;
  enableValueApproval: boolean;
  minAmountForApproval: number;
  marginThreshold: number;
};

export const DEFAULT_APPROVAL_SETTINGS: ApprovalSettings = {
  quotesRequireApproval: false,
  enableStockApproval: false,
  enablePriceApproval: false,
  enableValueApproval: false,
  minAmountForApproval: 100000,
  marginThreshold: 10,
};

export function getApprovalSettings(): ApprovalSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_APPROVAL_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      quotesRequireApproval: Boolean(parsed.quotesRequireApproval),
      enableStockApproval: Boolean(parsed.enableStockApproval),
      enablePriceApproval: Boolean(parsed.enablePriceApproval),
      enableValueApproval: Boolean(parsed.enableValueApproval ?? parsed.enableCreditLimitApproval),
      minAmountForApproval: Number(parsed.minAmountForApproval) || DEFAULT_APPROVAL_SETTINGS.minAmountForApproval,
      marginThreshold: Number(parsed.marginThreshold) || DEFAULT_APPROVAL_SETTINGS.marginThreshold,
    };
  } catch {
    return { ...DEFAULT_APPROVAL_SETTINGS };
  }
}

export function saveApprovalSettings(next: Partial<ApprovalSettings>) {
  const merged = { ...getApprovalSettings(), ...next };
  localStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}
