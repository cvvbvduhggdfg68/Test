import React from 'react';
import type { AspectRatio } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { Spinner } from './Spinner';

interface StoryInputProps {
    storyIdea: string;
    setStoryIdea: (value: string) => void;
    duration: number;
    setDuration: (value: number) => void;
    aspectRatio: AspectRatio;
    setAspectRatio: (value: AspectRatio) => void;
    onGenerate: () => void;
    isLoading: boolean;
}

const aspectRatios: { value: AspectRatio; label: string }[] = [
    { value: '9:16', label: 'ستوري (9:16)' },
    { value: '16:9', label: 'يوتيوب (16:9)' },
    { value: '1:1', label: 'مربع (1:1)' },
    { value: '4:3', label: 'كلاسيكي (4:3)' },
    { value: '3:4', label: 'بورتريه (3:4)' },
];

export const StoryInput: React.FC<StoryInputProps> = ({
    storyIdea,
    setStoryIdea,
    duration,
    setDuration,
    aspectRatio,
    setAspectRatio,
    onGenerate,
    isLoading,
}) => {
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700">
            <div className="space-y-6">
                <div>
                    <label htmlFor="storyIdea" className="block text-sm font-medium text-gray-300 mb-2">
                        فكرة القصة
                    </label>
                    <textarea
                        id="storyIdea"
                        rows={4}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                        placeholder="مثال: قط صغير ضائع يبحث عن عائلته في مدينة كبيرة..."
                        value={storyIdea}
                        onChange={(e) => setStoryIdea(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-2">
                            مدة الفيديو (بالثواني)
                        </label>
                        <input
                            type="number"
                            id="duration"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            min="5"
                            max="120"
                        />
                    </div>
                    <div>
                        <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-2">
                            الأبعاد
                        </label>
                        <select
                            id="aspectRatio"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                        >
                            {aspectRatios.map(ratio => (
                                <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="text-center mt-8">
                <button
                    onClick={onGenerate}
                    disabled={isLoading || !storyIdea}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 flex items-center justify-center mx-auto"
                >
                    {isLoading ? <Spinner size="sm" /> : <SparklesIcon />}
                    <span className="mr-2">{isLoading ? 'جاري الإنشاء...' : 'الخطوة التالية: إنشاء الشخصيات'}</span>
                </button>
            </div>
        </div>
    );
};