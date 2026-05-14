import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOCK_FINANCIAL_ACCOUNTS, MOCK_OWNERS, formatMaskedAccount, ownerDisplayName } from '../../data/mockOwners';
import type { FinancialAccount, OwnerProfile } from '../../types/owners';

interface Props {
  value?: string;
  onChange?: (id: string) => void;
  accounts?: FinancialAccount[];
  owners?: OwnerProfile[];
  placeholder?: string;
}

export default function AccountOwnerSelect({
  value, onChange,
  accounts = MOCK_FINANCIAL_ACCOUNTS,
  owners = MOCK_OWNERS,
  placeholder = 'Select an account',
}: Props) {
  const grouped = owners
    .map(o => ({ owner: o, accts: accounts.filter(a => a.ownerProfileId === o.id) }))
    .filter(g => g.accts.length > 0);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {grouped.map(({ owner, accts }) => (
          <SelectGroup key={owner.id}>
            <SelectLabel>{ownerDisplayName(owner)}</SelectLabel>
            {accts.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.nickname} ({a.currency} {formatMaskedAccount(a.accountNumber)})
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}