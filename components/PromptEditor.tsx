
import React, { useState, useEffect } from 'react';
import { IconButton } from './IconButton';
import { SaveIcon } from './icons/SaveIcon';

interface PromptEditorProps {
    label: string;
    initialValue: string;
    onSave: (newValue: string) => void;
    rows?: number;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ label, initialValue, onSave, rows = 3 }) => {
    const [value, setValue] = useState(initialValue);
    const [isDirty, setIsDirty] = useState(false);
    
    useEffect(() => {
        setValue(initialValue);
        setIsDirty(false);
    }, [initialValue]);

    const handleSave = () => {
        if (isDirty) {
            onSave(value);
            setIsDirty(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <h4 className="font-semibold text-gray-300 text-sm">{label}</h4>
                <div className="flex items-center space-x-2 space-x-reverse">
                    {isDirty && (
                         <button onClick={handleSave} className="flex items-center space-x-1 rtl:space-x-reverse bg-green-600 text-white px-2 py-1 rounded-md text-xs hover:bg-green-700 transition">
                            <SaveIcon />
                            <span>حفظ</span>
                        </button>
                    )}
                    <IconButton text="نسخ" textSuccess="تم النسخ!" contentToCopy={value} />
                </div>
            </div>
            <textarea
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    setIsDirty(e.target.value !== initialValue);
                }}
                rows={rows}
                className="w-full bg-black/20 p-2 rounded-md text-sm text-gray-400 border border-gray-700/50 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition custom-scrollbar"
            />
        </div>
    );
};
