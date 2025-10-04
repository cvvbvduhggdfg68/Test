import React, { useState, useEffect, useRef } from 'react';
import type { Scene } from '../types';
import { Spinner } from './Spinner';

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    scenes: Scene[];
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, scenes }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const scenesWithVideo = scenes.filter(s => s.videoUrl).sort((a, b) => a.scene_number - b.scene_number);

    useEffect(() => {
        if (isOpen && scenesWithVideo.length > 0) {
            setCurrentSceneIndex(0);
        } else if (!isOpen) {
            // Stop any ongoing speech when modal is closed
            window.speechSynthesis.cancel();
        }
    }, [isOpen, scenesWithVideo.length]);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!isOpen || !videoElement || scenesWithVideo.length === 0) return;

        const currentScene = scenesWithVideo[currentSceneIndex];
        if (!currentScene || !currentScene.videoUrl) return;

        videoElement.src = currentScene.videoUrl;

        const playVideoAndSpeak = () => {
            videoElement.play().catch(e => console.error("Video play failed:", e));
            
            if (currentScene.dialogue) {
                const utterance = new SpeechSynthesisUtterance(currentScene.dialogue);
                utterance.lang = 'ar-SA';
                utterance.rate = 0.9;
                window.speechSynthesis.speak(utterance);
            }
        };

        const handleCanPlay = () => {
           playVideoAndSpeak();
        };

        const handleEnded = () => {
            // Move to the next scene
            if (currentSceneIndex < scenesWithVideo.length - 1) {
                setCurrentSceneIndex(currentSceneIndex + 1);
            } else {
                // Loop back to the beginning
                setCurrentSceneIndex(0);
            }
        };

        videoElement.addEventListener('canplay', handleCanPlay);
        videoElement.addEventListener('ended', handleEnded);

        // Load the new video source
        videoElement.load();
        
        return () => {
            videoElement.removeEventListener('canplay', handleCanPlay);
            videoElement.removeEventListener('ended', handleEnded);
             // Clean up speech synthesis on scene change
            window.speechSynthesis.cancel();
        };

    }, [isOpen, currentSceneIndex, scenesWithVideo]);

    if (!isOpen) return null;

    const currentScene = scenesWithVideo[currentSceneIndex];

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl m-4 flex flex-col"
                style={{ maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 sm:p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-purple-300">عرض القصة</h2>
                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        إغلاق
                    </button>
                </header>

                <div className="p-2 sm:p-4 flex-grow overflow-y-auto bg-black">
                   {scenesWithVideo.length > 0 && currentScene ? (
                       <div className="w-full">
                           <video
                                ref={videoRef}
                                key={currentScene.id}
                                className="w-full h-auto max-h-[60vh] rounded-lg"
                                controls
                                muted // Mute video to allow TTS audio to be primary
                           />
                           <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                               <p className="text-sm text-gray-400">المشهد {currentScene.scene_number}</p>
                               <p className="text-lg text-white font-semibold">
                                   <span className="text-purple-300">{currentScene.character_name}:</span> {currentScene.dialogue}
                               </p>
                           </div>
                       </div>
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-gray-400">
                           <Spinner />
                           <p className="mt-4">لا توجد فيديوهات جاهزة للعرض.</p>
                       </div>
                   )}
                </div>
            </div>
        </div>
    );
};
