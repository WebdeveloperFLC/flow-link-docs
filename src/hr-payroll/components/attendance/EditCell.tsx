import { useState } from "react";

type Props = {
  value: string;
  onSave: (v: string) => void;
  editable?: boolean;
};

export function EditCell({ value, onSave, editable = true }: Props) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);

  if (!editable) return <span>{value}</span>;

  if (editing) {
    return (
      <input
        className="calc-input"
        style={{ width: 72 }}
        value={v}
        autoFocus
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setEditing(false);
          onSave(v === "—" ? "" : v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            onSave(v === "—" ? "" : v);
          }
        }}
      />
    );
  }

  return (
    <span className="punch-cell" onClick={() => setEditing(true)}>
      {value || "—"}
    </span>
  );
}
