import { cn } from '@/lib/utils';

interface Props {
  color: string; // any valid CSS color (hex or hsl(...) string)
  selected?: boolean;
  size?: number;
  title?: string;
  onClick?: () => void;
}

export function ColorSwatch({ color, selected, size = 28, title, onClick }: Props) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{ background: color, width: size, height: size }}
      className={cn(
        'rounded-full border border-border/40 shadow-sm transition-all hover:scale-110',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    />
  );
}