interface Props {
  label: string;
  colSpan?: number;
}

export default function ReportSectionHeader({ label, colSpan = 4 }: Props) {
  return (
    <tr className="bg-muted/40">
      <td
        colSpan={colSpan}
        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </td>
    </tr>
  );
}