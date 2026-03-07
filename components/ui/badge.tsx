import { cn } from '@/lib/utils';

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export function Badge({ children, className }: BadgeProps) {
  return <span className={cn('rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700', className)}>{children}</span>;
}
