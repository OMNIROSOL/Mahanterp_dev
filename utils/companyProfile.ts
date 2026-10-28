const KEY = 'mahant.companyProfile';

export type CompanyProfile = {
  name: string;
  address: string;
  tpin: string;
  phone: string;
  email: string;
};

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: 'Mahant Investments Limited',
  address: 'Plot 5254, Mukwa Road, Heavy Industrial Area, Lusaka, Zambia',
  tpin: '1001849201',
  phone: '+260 211 287188 / +260 977 770246',
  email: 'info@mahantinvestments.com',
};

export function getCompanyProfile(): CompanyProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_COMPANY_PROFILE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_COMPANY_PROFILE, ...parsed };
  } catch {
    return { ...DEFAULT_COMPANY_PROFILE };
  }
}

export function saveCompanyProfile(next: Partial<CompanyProfile>) {
  const merged = { ...getCompanyProfile(), ...next };
  localStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}
