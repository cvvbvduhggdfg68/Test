
import React from 'react';
import { CogIcon } from './icons/CogIcon';

interface HeaderProps {
    onShowSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onShowSettings }) => {
    return (
        <header className="py-4 mb-4 sm:mb-6">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-gray-800/80 pb-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    صانع برومبتات القصة
                </h1>
                <div className="flex items-center space-x-2 space-x-reverse">
                    <button
                        onClick={onShowSettings}
                        className="bg-gray-800/70 hover:bg-gray-700/70 border border-gray-700 text-white font-bold p-2.5 rounded-lg transition-colors text-sm"
                        title="الإعدادات"
                    >
                        <CogIcon />
                    </button>
                </div>
            </div>
        </header>
    );
};
