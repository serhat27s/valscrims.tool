import { cn } from '@/lib/utils';

interface MapCountSelectorProps {
  selectedCount: 1 | 3 | 5;
  onSelect: (count: 1 | 3 | 5) => void;
}

export const MapCountSelector = ({ selectedCount, onSelect }: MapCountSelectorProps) => {
  const options: { value: 1 | 3 | 5; label: string }[] = [
    { value: 1, label: 'BO1' },
    { value: 3, label: 'BO3' },
    { value: 5, label: 'BO5' },
  ];

  return (
    <div className="flex gap-2">
      {options.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className={cn(
            "px-6 py-3 valorant-clip transition-all duration-200 valorant-title text-lg tracking-wider",
            selectedCount === value
              ? "bg-primary text-primary-foreground valorant-glow"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
