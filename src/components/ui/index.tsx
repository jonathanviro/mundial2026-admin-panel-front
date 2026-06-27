import { cn } from '@/lib/utils'
import { Loader2, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, KeyboardEvent } from 'react'

// ── Button ────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-accent text-white hover:bg-accent-dark active:scale-95',
    secondary: 'bg-surface-card2 text-[#e8eaf0] border border-white/10 hover:border-white/20 active:scale-95',
    danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-95',
    ghost:     'text-[#7a8899] hover:text-[#e8eaf0] hover:bg-white/5',
    success:   'bg-success text-white hover:bg-success-light active:scale-95',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
}

export function Input({ label, error, helpText, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-[#7a8899] uppercase tracking-wide">{label}</label>}
      <input
        className={cn(
          'w-full px-3 py-2.5 rounded-lg bg-surface-card2 border text-sm text-[#e8eaf0] placeholder-[#4a5568] outline-none transition-colors',
          error ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-accent/60',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {helpText && !error && <p className="text-xs text-[#7a8899]">{helpText}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export function Select({ label, error, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-[#7a8899] uppercase tracking-wide">{label}</label>}
      <select
        className={cn(
          'w-full px-3 py-2.5 rounded-lg bg-surface-card2 border text-sm text-[#e8eaf0] outline-none transition-colors',
          error ? 'border-red-500' : 'border-white/10 focus:border-accent/60',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── SearchableSelect ──────────────────────────────────────────────────────
interface SearchableSelectProps {
  options: Array<{ team: string; flag: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  filterOut?: string[];
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar equipo...",
  label,
  error,
  filterOut = [],
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.team === value);

  const filtered = options.filter(
    (o) =>
      !filterOut.includes(o.team) &&
      o.team.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    setHighlightedIdx(-1);
  }, [search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectOption = (opt: (typeof options)[0]) => {
    onChange(opt.team);
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      e.preventDefault();
      selectOption(filtered[highlightedIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label className="text-xs font-medium text-[#7a8899] uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          value={selected && !open ? `${selected.flag} ${selected.team}` : search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (!open) {
              setOpen(true);
              setSearch("");
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={!open && selected ? "" : placeholder}
          className={cn(
            "w-full px-3 py-2.5 rounded-lg bg-surface-card2 border text-sm text-[#e8eaf0] placeholder-[#4a5568] outline-none transition-colors cursor-pointer",
            error
              ? "border-red-500"
              : "border-white/10 focus:border-accent/60",
            className,
          )}
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a8899] pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 max-h-60 overflow-y-auto rounded-lg bg-surface-card border border-white/10 shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[#7a8899]">
              Sin resultados
            </div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt.team}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2",
                  i === highlightedIdx
                    ? "bg-white/10"
                    : "hover:bg-white/5",
                  opt.team === value
                    ? "text-accent"
                    : "text-[#e8eaf0]",
                )}
                onMouseEnter={() => setHighlightedIdx(i)}
                onClick={() => selectOption(opt)}
              >
                <span>{opt.flag}</span>
                <span>{opt.team}</span>
              </div>
            ))
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-surface-card border border-white/[0.06] rounded-xl', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4 border-b border-white/[0.06] flex items-center justify-between', className)}>{children}</div>
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>
}

// ── Badge ─────────────────────────────────────────────────────────────────
interface BadgeProps { children: ReactNode; variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; className?: string }

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const variants = {
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    danger:  'bg-red-500/10 text-red-400 border-red-500/20',
    info:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    neutral: 'bg-white/5 text-[#7a8899] border-white/10',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', variants[variant], className)}>
      {children}
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = 'text-accent' }: { label: string; value: string | number; icon: any; color?: string }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={cn('p-3 rounded-xl bg-white/5', color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-[#7a8899] mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[#e8eaf0]">{value}</p>
      </div>
    </Card>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-surface-card border border-white/10 rounded-2xl shadow-2xl w-full animate-fade-in', width)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-[#7a8899] hover:text-[#e8eaf0] transition-colors">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Loading Spinner ───────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-accent', className)} />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-8 h-8" />
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-[#4a5568] mb-4" />
      <p className="font-medium text-[#7a8899]">{title}</p>
      {description && <p className="text-sm text-[#4a5568] mt-1 max-w-xs">{description}</p>}
    </div>
  )
}

// ── Alert ────────────────────────────────────────────────────────────────
export function Alert({ variant = 'info', children }: { variant?: 'info' | 'success' | 'warning' | 'danger'; children: ReactNode }) {
  const styles = {
    info:    'bg-blue-500/10 border-blue-500/20 text-blue-300',
    success: 'bg-green-500/10 border-green-500/20 text-green-300',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
    danger:  'bg-red-500/10 border-red-500/20 text-red-300',
  }
  return <div className={cn('px-4 py-3 rounded-lg border text-sm', styles[variant])}>{children}</div>
}

// ── Table ─────────────────────────────────────────────────────────────────
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn('text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase tracking-wider border-b border-white/[0.06] whitespace-nowrap', className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn('px-4 py-3 border-b border-white/[0.04] text-[#e8eaf0]', className)}>
      {children}
    </td>
  )
}
