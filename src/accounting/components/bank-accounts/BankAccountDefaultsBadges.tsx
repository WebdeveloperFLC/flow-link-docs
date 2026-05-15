import { BankAccount } from "../../types/bankAccounts";

export default function BankAccountDefaultsBadges({ account }: { account: BankAccount }) {
  const items = [
    { on: account.isDefaultPayment, label: "P", title: "Default payment account" },
    { on: account.isDefaultPayroll, label: "PR", title: "Default payroll account" },
    { on: account.isDefaultTax, label: "T", title: "Default tax account" },
  ];
  return (
    <div className="inline-flex gap-1">
      {items.map((it) => (
        <span
          key={it.label}
          title={it.title}
          className={
            "inline-flex items-center justify-center text-[10px] font-semibold w-6 h-5 rounded " +
            (it.on ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/50")
          }
        >
          {it.label}
        </span>
      ))}
    </div>
  );
}