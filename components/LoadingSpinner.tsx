'use client';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ message, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div
        className={`${sizeClasses[size]} border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin`}
      />
      {message && (
        <p className="text-gray-300 text-sm font-medium animate-pulse">{message}</p>
      )}
    </div>
  );
}
