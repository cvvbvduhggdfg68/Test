
import React, { useState } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';

interface IconButtonProps {
    text: string;
    textSuccess: string;
    contentToCopy: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ text, textSuccess, contentToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(contentToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
        >
            {copied ? <CheckIcon /> : <ClipboardIcon />}
            <span>{copied ? textSuccess : text}</span>
        </button>
    );
};
