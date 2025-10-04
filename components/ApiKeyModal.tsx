import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (apiKeys: string[]) => void;
    currentKeys: string[];
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentKeys }) => {
    const [apiKeyInput, setApiKeyInput] = useState('');

    useEffect(() => {
        setApiKeyInput(currentKeys.join('\n'));
    }, [currentKeys, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        const keys = apiKeyInput.split('\n').map(k => k.trim()).filter(Boolean);
        if (keys.length > 0) {
            onSave(keys);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md m-4 p-6 sm:p-8 text-white"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-purple-300 mb-4">إعدادات مفاتيح API</h2>
                <p className="text-gray-400 mb-6">
                    أدخل مفتاح Google AI API واحدًا أو أكثر (كل مفتاح في سطر جديد). سيتم التبديل بينها تلقائيًا.
                </p>
                <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
                        مفاتيح Google AI API
                    </label>
                    <textarea
                        id="apiKey"
                        rows={5}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition font-mono text-sm"
                        placeholder="أدخل كل مفتاح في سطر منفصل..."
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                    />
                </div>
                <div className="mt-8 flex justify-end space-x-3 space-x-reverse">
                    <button 
                        onClick={onClose}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        إغلاق
                    </button>
                    <button 
                        onClick={handleSave}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        disabled={!apiKeyInput.trim()}
                    >
                        حفظ
                    </button>
                </div>
            </div>
        </div>
    );
};