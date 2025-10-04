import React, { useState } from 'react';
import { IconButton } from './IconButton';
import { Spinner } from './Spinner';
import { DownloadIcon } from './icons/DownloadIcon';
import type { CharacterAndLocationPrompts, CharacterPrompt, LocationPrompt } from '../types';

interface CharactersAndLocationsProps {
    prompts: CharacterAndLocationPrompts;
    onGenerateImage: (item: CharacterPrompt | LocationPrompt, type: 'character' | 'location') => void;
    onDownload: (url: string, filename: string) => Promise<void>;
}

const ItemCard: React.FC<{ 
    item: CharacterPrompt | LocationPrompt;
    type: 'character' | 'location';
    onGenerateImage: () => void;
    onDownload: () => Promise<void>;
}> = ({ item, onGenerateImage, onDownload }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            await onDownload();
        } catch (error) {
            console.error("Download failed", error);
        } finally {
            setIsDownloading(false);
        }
    };
    
    return (
        <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700/80 flex flex-col sm:flex-row gap-4 items-start transition-all hover:border-purple-500/50">
            <div className="flex-shrink-0 w-full sm:w-36 h-36 rounded-lg overflow-hidden relative bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : item.isGenerating ? (
                    <Spinner size="md" />
                ) : (
                    <button 
                        onClick={onGenerateImage}
                        className="bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-indigo-700 transition"
                    >
                        إنشاء صورة
                    </button>
                )}
            </div>
            <div className="flex-grow w-full">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-200">{item.name}</h4>
                    <IconButton text="نسخ" textSuccess="تم النسخ!" contentToCopy={item.description} />
                </div>
                <p className="text-gray-400 whitespace-pre-wrap text-sm leading-relaxed h-28 overflow-y-auto bg-black/20 p-2 rounded-md">{item.description}</p>
                 {item.imageUrl && (
                     <button 
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-full mt-2 bg-green-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-green-700 transition flex items-center justify-center disabled:bg-green-800 disabled:cursor-wait"
                     >
                        {isDownloading ? <><Spinner size="sm" /><span className="mr-1">جاري...</span></> : <><DownloadIcon /><span className="mr-1">تحميل</span></>}
                     </button>
                )}
            </div>
        </div>
    );
};


export const CharactersAndLocations: React.FC<CharactersAndLocationsProps> = ({ prompts, onGenerateImage, onDownload }) => {
    return (
        <div className="space-y-8">
            {prompts.characters.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold text-purple-400 mb-4 border-r-4 border-purple-400 pr-3">الشخصيات</h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {prompts.characters.map((char) => (
                            <ItemCard 
                                key={char.name}
                                item={char}
                                type="character"
                                onGenerateImage={() => onGenerateImage(char, 'character')}
                                onDownload={() => onDownload(char.imageUrl!, `char_${char.name.replace(/\s/g, '_')}.jpeg`)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {prompts.locations.length > 0 && (
                 <div>
                    <h3 className="text-xl font-semibold text-purple-400 mb-4 border-r-4 border-purple-400 pr-3">المواقع</h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {prompts.locations.map((loc) => (
                            <ItemCard 
                                key={loc.name}
                                item={loc}
                                type="location"
                                onGenerateImage={() => onGenerateImage(loc, 'location')}
                                onDownload={() => onDownload(loc.imageUrl!, `loc_${loc.name.replace(/\s/g, '_')}.jpeg`)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};