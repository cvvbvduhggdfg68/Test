
import React, { useState, useEffect } from 'react';
import type { Scene, AspectRatio } from '../types';
import { Spinner } from './Spinner';
import { DownloadIcon } from './icons/DownloadIcon';
import { StopIcon } from './icons/StopIcon';
import { RetryIcon } from './icons/RetryIcon';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { FilmIcon } from './icons/FilmIcon';
import { PromptEditor } from './PromptEditor';

interface SceneCardProps {
    scene: Scene;
    aspectRatio: AspectRatio;
    onGenerateImage: (sceneId: number) => void;
    onRegenerateImage: (sceneId: number) => void;
    onGenerateVideo: (sceneId: number) => void;
    onRegenerateVideo: (sceneId: number) => void;
    onCancelGeneration: (sceneId: number) => void;
    onDownload: (url: string, filename: string) => Promise<void>;
    onUpdatePrompt: (sceneId: number, promptType: 'image' | 'video' | 'dialogue', newText: string) => void;
    onGenerateAudio: (sceneId: number) => void;
}

const loadingMessages = [
    "نستحضر الإبداع...",
    "نُحرّك البيكسلات...",
    "قد يستغرق هذا بضع دقائق...",
    "نصنع السحر، مشهدًا تلو الآخر...",
    "شكرًا لصبرك، النتيجة تستحق الانتظار!",
    "رؤيتك على وشك أن تصبح حقيقة...",
];

const aspectRatioMap: Record<AspectRatio, string> = {
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '3:4': 'aspect-[3/4]',
};

export const SceneCard: React.FC<SceneCardProps> = ({ scene, aspectRatio, onGenerateImage, onRegenerateImage, onGenerateVideo, onRegenerateVideo, onCancelGeneration, onDownload, onUpdatePrompt, onGenerateAudio }) => {
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const isGenerating = scene.isGeneratingImage || scene.isVideoGenerating;

    useEffect(() => {
        let interval: number;
        if (scene.isVideoGenerating) {
            interval = window.setInterval(() => {
                setCurrentLoadingMessage(prevMessage => {
                    const currentIndex = loadingMessages.indexOf(prevMessage);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 8000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [scene.isVideoGenerating]);

    const handleDownload = async (url: string, filename: string) => {
        setIsDownloading(true);
        try {
            await onDownload(url, filename);
        } catch (error) {
            console.error("Download failed", error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="bg-gray-900/60 p-5 rounded-2xl shadow-lg border border-gray-700/80 transition-all duration-300 hover:border-purple-500/50">
            <div className="flex flex-col gap-6">
                <h3 className="text-xl font-bold text-purple-300">مشهد #{scene.scene_number}</h3>
                
                {/* Visuals Section */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className={`w-full md:w-1/3 rounded-lg overflow-hidden relative bg-gray-800 ${aspectRatioMap[aspectRatio]}`}>
                        {scene.videoUrl ? (
                            <video key={scene.videoUrl} src={scene.videoUrl} controls autoPlay loop muted className="w-full h-full object-cover" />
                        ) : scene.imageUrl ? (
                            <img src={scene.imageUrl} alt={`Scene ${scene.scene_number}`} className="w-full h-full object-cover"/>
                        ) : (
                            <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center p-4">
                                <button onClick={() => onGenerateImage(scene.id)} className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-800 disabled:cursor-wait flex items-center justify-center" disabled={scene.isGeneratingImage}>
                                    {scene.isGeneratingImage ? <><Spinner size="sm" /><span className="mr-2">جاري الإنشاء...</span></> : 'إنشاء صورة'}
                                </button>
                            </div>
                        )}
                        {isGenerating && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center animate-fade-in backdrop-blur-sm p-4 text-center">
                                <Spinner />
                                <p className="text-white mt-3 font-semibold">{scene.isGeneratingImage ? "جاري إنشاء الصورة..." : currentLoadingMessage}</p>
                                <button onClick={() => onCancelGeneration(scene.id)} className="mt-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs rounded-lg flex items-center">
                                    <StopIcon /><span className="mr-1">إلغاء</span>
                                </button>
                            </div>
                        )}
                    </div>
                     <div className="grid grid-cols-2 gap-2 text-sm self-start w-full md:w-auto">
                        {scene.imageUrl && (
                             <button onClick={() => onGenerateVideo(scene.id)} disabled={isGenerating || !!scene.videoUrl} className="flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-800 disabled:cursor-not-allowed">
                                <FilmIcon /> تحريك
                            </button>
                        )}
                         {scene.imageUrl && (
                            <button onClick={() => onRegenerateImage(scene.id)} disabled={isGenerating} className="flex items-center justify-center gap-2 bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-800">
                                <RetryIcon /> صورة
                            </button>
                        )}
                        {scene.videoUrl && (
                             <button onClick={() => onRegenerateVideo(scene.id)} disabled={isGenerating} className="flex items-center justify-center gap-2 bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-800">
                                <RetryIcon /> فيديو
                            </button>
                        )}
                        {(scene.imageUrl) && (
                             <button onClick={() => handleDownload(scene.videoUrl || scene.imageUrl!, scene.videoUrl ? `scene_${scene.scene_number}_video.mp4` : `scene_${scene.scene_number}_image.jpeg`)} disabled={isDownloading || isGenerating} className="flex items-center justify-center gap-2 bg-sky-600 text-white px-3 py-2 rounded-lg hover:bg-sky-700 transition disabled:bg-sky-800 disabled:cursor-wait">
                                {isDownloading ? <Spinner size="sm" /> : <DownloadIcon />}
                                تحميل
                             </button>
                        )}
                   </div>
                </div>

                {/* Prompts Section */}
                <div className="w-full flex flex-col space-y-4">
                    <PromptEditor 
                        label="برومبت الصورة"
                        initialValue={scene.image_prompt}
                        onSave={(newText) => onUpdatePrompt(scene.id, 'image', newText)}
                    />
                    <PromptEditor 
                        label="برومبت الفيديو"
                        initialValue={scene.video_prompt}
                        onSave={(newText) => onUpdatePrompt(scene.id, 'video', newText)}
                    />
                </div>

                {/* Audio Track Section */}
                <div className="bg-black/20 p-3 rounded-lg border border-gray-700/50">
                    <h4 className="font-semibold text-gray-300 text-sm mb-2">المسار الصوتي</h4>
                    <div className="flex items-start gap-3">
                        <button onClick={() => onGenerateAudio(scene.id)} disabled={scene.isAudioGenerating} className="bg-teal-600 text-white p-2.5 rounded-md hover:bg-teal-700 transition disabled:bg-teal-800 disabled:cursor-wait">
                            {scene.isAudioGenerating ? <Spinner size="sm" /> : <SpeakerIcon />}
                        </button>
                        <div className="flex-grow">
                            <PromptEditor 
                                label={`حوار (${scene.character_name})`}
                                initialValue={scene.dialogue}
                                onSave={(newText) => onUpdatePrompt(scene.id, 'dialogue', newText)}
                                rows={2}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
