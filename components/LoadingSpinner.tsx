'use client';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ message, size = 'md' }: LoadingSpinnerProps) {
  const spinnerSize = { sm: 'w-5 h-5 border-2', md: 'w-9 h-9 border-2', lg: 'w-14 h-14 border-2' }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      <div className={`${spinnerSize} border-white/10 border-t-white/70 rounded-full animate-spin`} />
      {message && (
        <p className="text-white/40 text-sm font-medium text-center max-w-xs">{message}</p>
      )}
    </div>
  );
}
