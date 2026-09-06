import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Account } from '../types';
import { cn } from '../utils/cn';

export type StatementAccount = Account & {
  accountType?: string;
  isPaymentAccount?: boolean;
  inactive?: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDisplayDate(d: Date) {
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function formatLineAmount(value: number) {
  if (!value || Math.abs(value) < 0.005) return '—';
  const abs = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-${abs}` : abs;
}

function formatHeaderAmount(value: number, currency = 'ZMW') {
  const abs = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!value || Math.abs(value) < 0.005) return `${currency} 0.00`;
  return value < 0 ? `- ${currency} ${abs}` : `${currency} ${abs}`;
}

function typeOf(a: StatementAccount) {
  return a.accountType || a.type;
}

function assetGroup(a: StatementAccount): string | null {
  const name = (a.name || '').toLowerCase();
  if (a.isPaymentAccount || /(bank|airtel|cash|money wallet)/.test(name)) {
    return 'Cash & cash equivalents';
  }
  if (name.includes('receivable')) return 'Accounts receivable';
  if (name.includes('prepay') || name.includes('prepaid')) return 'Supplier prepayments';
  if (name.includes('inventory')) return 'Inventory on hand';
  if (/(vehicle|furniture|computer|printer|machine|tool|meter|equipment|fixed)/.test(name)) {
    return 'Fixed Assets';
  }
  if (/(suspense|clearing|special)/.test(name)) return 'Special Accounts';
  return null;
}

function liabilityGroup(a: StatementAccount): string | null {
  const name = (a.name || '').toLowerCase();
  if (/account.?payable/.test(name)) return 'Accounts payable';
  if (name.includes('tax payable') || name.includes('tax-payable')) return 'Tax payable';
  if (name.includes('advance') || name.includes('deposit')) return 'Customer advances';
  return null;
}

interface GroupNode {
  key: string;
  label: string;
  accounts: StatementAccount[];
  isGroup: boolean;
}

const ASSET_GROUP_ORDER = [
  'Accounts receivable',
  'Supplier prepayments',
  'Cash & cash equivalents',
  'Fixed Assets',
  'Inventory on hand',
  'Special Accounts',
];

const LIABILITY_GROUP_ORDER = ['Accounts payable', 'Tax payable', 'Customer advances'];

function buildGroups(
  accounts: StatementAccount[],
  classify: (a: StatementAccount) => string | null,
  groupOrder: string[] = []
): GroupNode[] {
  const buckets = new Map<string, StatementAccount[]>();
  const standalone: StatementAccount[] = [];

  for (const account of accounts) {
    const group = classify(account);
    if (group) {
      const list = buckets.get(group) || [];
      list.push(account);
      buckets.set(group, list);
    } else {
      standalone.push(account);
    }
  }

  const sortAccounts = (list: StatementAccount[]) =>
    [...list].sort((a, b) => a.name.localeCompare(b.name));

  const nodes: GroupNode[] = [];

  const pushBucket = (label: string, list: StatementAccount[]) => {
    const sorted = sortAccounts(list);
    if (sorted.length === 1) {
      nodes.push({
        key: sorted[0].id,
        label: sorted[0].name,
        accounts: sorted,
        isGroup: false,
      });
      return;
    }
    nodes.push({ key: label, label, accounts: sorted, isGroup: true });
  };

  for (const label of groupOrder) {
    const list = buckets.get(label);
    if (!list?.length) continue;
    buckets.delete(label);
    pushBucket(label, list);
  }

  for (const [label, list] of buckets) {
    pushBucket(label, list);
  }

  for (const account of sortAccounts(standalone)) {
    nodes.push({
      key: account.id,
      label: account.name,
      accounts: [account],
      isGroup: false,
    });
  }

  return nodes;
}

function accountHref(account: StatementAccount) {
  return account.isPaymentAccount
    ? `/account/view/${account.id}`
    : `/accounts/view/${account.id}`;
}

function childLabel(account: StatementAccount, siblings: StatementAccount[]) {
  const sameName =
    siblings.filter(
      (item) => item.name.trim().toLowerCase() === account.name.trim().toLowerCase()
    ).length > 1;
  if (sameName && account.code) return account.code;
  return account.name;
}

const Amount: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <span className={cn('tabular-nums text-[13px] text-teal-500 font-medium', className)}>
    {formatLineAmount(value)}
  </span>
);

const StatementCard: React.FC<{
  title: string;
  total: number;
  groups: GroupNode[];
}> = ({ title, total, groups }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_4px_rgba(15,23,42,0.05)] px-6 py-5">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
        <span className="text-[15px] font-bold text-slate-900 tabular-nums whitespace-nowrap">
          {formatHeaderAmount(total)}
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="text-[13px] text-slate-400 py-2">No accounts</p>
      ) : (
        <div>
          {groups.map((group) => {
            const sum = group.accounts.reduce((acc, item) => acc + (item.balance || 0), 0);

            if (!group.isGroup) {
              const account = group.accounts[0];
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => navigate(accountHref(account))}
                  className="w-full flex items-center justify-between gap-4 py-[7px] text-left rounded-md hover:bg-slate-50 -mx-1.5 px-1.5 transition-colors"
                >
                  <span className="text-[13px] text-slate-700 truncate">{account.name}</span>
                  <Amount value={account.balance} />
                </button>
              );
            }

            return (
              <div key={group.key} className="py-1">
                <div className="flex items-baseline justify-between gap-4 py-1">
                  <span className="text-[13px] font-semibold text-slate-800">{group.label}</span>
                  <span className="text-[13px] text-slate-400 tabular-nums">{formatLineAmount(sum)}</span>
                </div>
                <div className="pl-5">
                  {group.accounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => navigate(accountHref(account))}
                      className="w-full flex items-center justify-between gap-4 py-[6px] text-left rounded-md hover:bg-slate-50 -mx-1.5 px-1.5 transition-colors"
                    >
                      <span className="text-[13px] text-slate-600 truncate">
                        {childLabel(account, group.accounts)}
                      </span>
                      <Amount value={account.balance} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const FinancialStatements: React.FC<{
  accounts: StatementAccount[];
  showNetProfit?: boolean;
}> = ({ accounts, showNetProfit = false }) => {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const active = accounts.filter((account) => !account.inactive);
  const byType = (...types: string[]) => active.filter((account) => types.includes(typeOf(account)));

  const assets = byType('Asset');
  const liabilities = byType('Liability');
  const equity = byType('Equity');
  const income = byType('Income', 'Revenue');
  const expenses = byType('Expense');

  const sum = (list: StatementAccount[]) => list.reduce((acc, item) => acc + (item.balance || 0), 0);
  const netProfit = sum(income) - sum(expenses);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8 items-start">
      <section>
        <div className="mb-4">
          <h2 className="text-[17px] font-bold text-slate-900">Balance Sheet</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">As at {formatDisplayDate(today)}</p>
        </div>
        <div className="space-y-4">
          <StatementCard
            title="Assets"
            total={sum(assets)}
            groups={buildGroups(assets, assetGroup, ASSET_GROUP_ORDER)}
          />
          <StatementCard
            title="Liabilities"
            total={sum(liabilities)}
            groups={buildGroups(liabilities, liabilityGroup, LIABILITY_GROUP_ORDER)}
          />
          {equity.length > 0 && (
            <StatementCard
              title="Equity"
              total={sum(equity)}
              groups={buildGroups(equity, () => null)}
            />
          )}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-[17px] font-bold text-slate-900">Profit and Loss Statement</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">
            from {formatDisplayDate(yearStart)} to {formatDisplayDate(today)}
          </p>
        </div>
        <div className="space-y-4">
          <StatementCard
            title="Income"
            total={sum(income)}
            groups={buildGroups(income, () => null)}
          />
          <StatementCard
            title="Less Expenses"
            total={sum(expenses)}
            groups={buildGroups(expenses, () => null)}
          />
        </div>
        {showNetProfit && (
          <div className="mt-4 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_4px_rgba(15,23,42,0.05)] px-6 py-4 flex items-center justify-between">
            <span className="text-[14px] font-bold text-slate-900">Net Profit</span>
            <span
              className={cn(
                'text-[15px] font-bold tabular-nums',
                netProfit < 0 ? 'text-rose-500' : 'text-slate-900'
              )}
            >
              {formatHeaderAmount(netProfit)}
            </span>
          </div>
        )}
      </section>
    </div>
  );
};

export default FinancialStatements;
