import React from 'react';

interface SpinnerProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const Spinner: React.FC<SpinnerProps> = ({ message, size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-5 h-5 border-2',
        md: 'w-8 h-8 border-4',
        lg: 'w-12 h-12 border-4',
    };

    return (
        <div className="flex flex-col items-center justify-center text-center">
            <div className={`${sizeClasses[size]} border-purple-400 border-t-transparent rounded-full animate-spin`}></div>
            {message && <p className="mt-3 text-lg text-purple-300">{message}</p>}
        </div>
    );
};