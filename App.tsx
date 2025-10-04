
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { SceneCard } from './components/SceneCard';
import { Spinner } from './components/Spinner';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PreviewModal } from './components/PreviewModal';
import { initializeAi, generateCharacterPrompts, generateScenePrompts, generateImage, generateVideo, improveStory } from './services/geminiService';
import type { Scene, AspectRatio, CharacterAndLocationPrompts, CharacterPrompt, LocationPrompt, AppState, Project } from './types';

import { SparklesIcon } from './components/icons/SparklesIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { FilmIcon } from './components/icons/FilmIcon';
import { PlayIcon } from './components/icons/PlayIcon';
import { DocumentTextIcon } from './components/icons/DocumentTextIcon';
import { PlusIcon } from './components/icons/PlusIcon';
import { TrashIcon } from './components/icons/TrashIcon';
import { UploadIcon } from './components/icons/UploadIcon';
import { FolderIcon } from './components/icons/FolderIcon';
import { PromptEditor } from './components/PromptEditor';
import { RetryIcon } from './components/icons/RetryIcon';
import { StopIcon } from './components/icons/StopIcon';


declare const FFmpeg: any;
declare const FFmpegUtil: any;

const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            return resolve();
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
};

const loadFfmpeg = async () => {
    try {
        await loadScript("https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js");
        await loadScript("https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js");
    } catch (error) {
        console.error("FFmpeg loading failed:", error);
        throw error;
    }
};

const downloadFile = async (url: string, filename: string) => {
    try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Download failed for', filename, error);
    }
};

const initialAppState: AppState = {
    storyIdea: '',
    duration: 32, // Default to 4 scenes * 8s
    aspectRatio: '9:16',
    style: 'Pixar-style, DreamWorks style, 3D cartoon, cinematic atmosphere, ultra high detail',
    characterPrompts: null,
    scenes: [],
    currentStep: 'dashboard',
};


// --- START: DASHBOARD COMPONENT ---
const Dashboard: React.FC<{
    appState: AppState;
    updateState: (updates: Partial<AppState>) => void;
    onAnalyze: () => void;
    isLoading: boolean;
    projects: Project[];
    currentProjectId: string | null;
    onLoadProject: (id: string) => void;
    onNewProject: () => void;
    onDeleteProject: (id: string) => void;
    onRenameProject: (id: string, newName: string) => void;
    onExportProject: (id: string) => void;
    onImportProject: (file: File) => void;
    improveStoryWithAi: () => void;
    isImproving: boolean;
}> = ({
    appState, updateState, onAnalyze, isLoading, projects, currentProjectId,
    onLoadProject, onNewProject, onDeleteProject, onRenameProject, onExportProject, onImportProject,
    improveStoryWithAi, isImproving
}) => {
    const { storyIdea, duration, aspectRatio, style } = appState;
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => importInputRef.current?.click();
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) onImportProject(file);
    };

    const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [name, setName] = useState(project.name);
        const isCurrent = project.id === currentProjectId;
        
        const images = [
            ...(project.state.characterPrompts?.characters.map(c => c.imageUrl).filter(Boolean) as string[] || []),
            ...(project.state.characterPrompts?.locations.map(l => l.imageUrl).filter(Boolean) as string[] || [])
        ].slice(0, 4);

        const handleRename = () => {
            if (name.trim() && name !== project.name) {
                onRenameProject(project.id, name.trim());
            }
            setIsEditing(false);
        };

        return (
            <div className={`bg-gray-800/50 p-4 rounded-lg border-2 transition-all flex flex-col ${isCurrent ? 'border-purple-500' : 'border-gray-700 hover:border-gray-600'}`}>
                <div className="relative mb-3 aspect-[16/10] bg-gray-900 rounded-md overflow-hidden border border-gray-700">
                    {images.length > 0 ? (
                        <div className={`grid ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${images.length > 2 ? 'grid-rows-2' : 'grid-rows-1'} h-full gap-0.5`}>
                            {images.map((img, index) => (
                                <img key={index} src={img} className="w-full h-full object-cover" alt={`معاينة ${index + 1}`} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-600">
                            <FilmIcon />
                        </div>
                    )}
                </div>
                <div className="flex-grow mb-3">
                    {isEditing ? (
                        <input
                            type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleRename}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm w-full" autoFocus
                        />
                    ) : (
                         <h3 className="font-bold text-gray-100 cursor-pointer" onDoubleClick={() => setIsEditing(true)} title="انقر نقرًا مزدوجًا لإعادة التسمية">
                            {project.name}
                        </h3>
                    )}
                    <p className="text-xs text-gray-400 mt-1">آخر حفظ: {new Date(project.lastSaved).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-auto">
                    <button onClick={() => onLoadProject(project.id)} disabled={isCurrent} className="flex-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition">
                        {isCurrent ? 'محمّل' : 'تحميل'}
                    </button>
                    <button onClick={() => onExportProject(project.id)} className="p-2 text-gray-300 hover:text-sky-400 rounded-md hover:bg-gray-700 transition" title="تصدير المشروع">
                       <DownloadIcon />
                    </button>
                    <button onClick={() => onDeleteProject(project.id)} className="p-2 text-gray-300 hover:text-red-500 rounded-md hover:bg-gray-700 transition" title="حذف المشروع">
                       <TrashIcon />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700">
                <div className="relative">
                    <textarea
                        id="storyIdea" rows={4}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-lg"
                        placeholder="مثال: قط صغير ضائع يبحث عن عائلته في مدينة كبيرة..."
                        value={storyIdea} onChange={(e) => updateState({ storyIdea: e.target.value })}
                    />
                    <button onClick={improveStoryWithAi} disabled={isImproving || !storyIdea} className="absolute bottom-3 right-3 rtl:right-auto rtl:left-3 bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-indigo-700 transition flex items-center disabled:bg-indigo-800 disabled:cursor-wait">
                        {isImproving ? <Spinner size="sm" /> : <SparklesIcon />}
                        <span className="mr-1.5">{isImproving ? 'جاري التحسين...' : 'تحسين بالذكاء الاصطناعي'}</span>
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">مدة الفيديو (بالثواني)</label>
                        <input type="number" value={duration} onChange={(e) => updateState({ duration: Number(e.target.value) })} min="8" step="1"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">الأبعاد</label>
                        <select value={aspectRatio} onChange={(e) => updateState({ aspectRatio: e.target.value as AspectRatio })}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition">
                            <option value="9:16">ستوري (9:16)</option>
                            <option value="16:9">يوتيوب (16:9)</option>
                            <option value="1:1">مربع (1:1)</option>
                            <option value="4:3">كلاسيكي (4:3)</option>
                            <option value="3:4">بورتريه (3:4)</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">النمط البصري</label>
                        <select value={style} onChange={(e) => updateState({ style: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition">
                            <option value="Pixar-style, DreamWorks style, 3D cartoon, cinematic atmosphere, ultra high detail">3D كرتون</option>
                        </select>
                    </div>
                </div>
                <div className="text-center mt-8">
                    <button onClick={onAnalyze} disabled={isLoading || !storyIdea}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 flex items-center justify-center mx-auto text-lg">
                        {isLoading ? <Spinner size="sm" /> : <span className="font-sans text-xl">&larr;</span>}
                        <span className="mr-2">{isLoading ? 'جاري التحليل...' : 'التالي: إعداد الشخصيات'}</span>
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-200">المشاريع</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handleImportClick} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2">
                            <UploadIcon /><span className="hidden sm:inline">استيراد</span>
                        </button>
                        <input type="file" ref={importInputRef} onChange={handleFileChange} accept="application/json" className="hidden" />
                        <button onClick={onNewProject} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2">
                            <PlusIcon /><span className="hidden sm:inline">مشروع جديد</span>
                        </button>
                    </div>
                </div>
                {projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {projects.sort((a, b) => b.lastSaved - a.lastSaved).map(p => <ProjectCard key={p.id} project={p} />)}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700">
                        <p className="text-gray-400">لم يتم العثور على مشاريع. ابدأ مشروعًا جديدًا للبدء!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
// --- END: DASHBOARD COMPONENT ---


// --- START: CHARACTER/LOCATION SETUP COMPONENT ---
const CharacterLocationSetup: React.FC<{
    type: 'character' | 'location';
    prompts: CharacterAndLocationPrompts | null;
    onGenerateImage: (item: CharacterPrompt | LocationPrompt, type: 'character' | 'location') => void;
    onUploadImage: (item: CharacterPrompt | LocationPrompt, type: 'character' | 'location', file: File) => void;
    onUpdateDescription: (item: CharacterPrompt | LocationPrompt, type: 'character' | 'location', newDescription: string) => void;
    onCancelGeneration: (item: CharacterPrompt | LocationPrompt, type: 'character' | 'location') => void;
    onRegenerateDescriptions: () => void;
    isRegeneratingDescriptions: boolean;
    onBack: () => void;
    onNext: () => void;
    isLoading: boolean;
}> = ({ 
    type, prompts, onGenerateImage, onUploadImage, onUpdateDescription, onCancelGeneration, 
    onRegenerateDescriptions, isRegeneratingDescriptions, onBack, onNext, isLoading 
}) => {
    const title = type === 'character' ? 'الشخصيات' : 'المواقع';
    const data = (type === 'character' ? prompts?.characters : prompts?.locations) || [];
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const [currentItem, setCurrentItem] = useState<CharacterPrompt | LocationPrompt | null>(null);

    const handleUploadClick = (item: CharacterPrompt | LocationPrompt) => {
        setCurrentItem(item);
        uploadInputRef.current?.click();
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && currentItem) {
            onUploadImage(currentItem, type, file);
        }
    };
    
    const allImagesReady = data.every(item => item.imageUrl);

    const ItemCard: React.FC<{ item: CharacterPrompt | LocationPrompt }> = ({ item }) => (
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex flex-col gap-4 transition-all hover:border-purple-500/50">
            <div className="flex-shrink-0 w-full aspect-square rounded-lg overflow-hidden relative bg-gray-900/50 border-2 border-dashed border-gray-700 flex flex-col items-center justify-center text-center p-2">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : item.isGenerating ? (
                    <div className="flex flex-col items-center justify-center text-center p-2">
                        <Spinner message="جاري الإنشاء..." />
                        <button onClick={() => onCancelGeneration(item, type)} className="mt-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs rounded-lg flex items-center">
                            <StopIcon /><span className="mr-1">إلغاء</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                         <button onClick={() => onGenerateImage(item, type)} className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 transition w-full">إنشاء صورة</button>
                         <button onClick={() => handleUploadClick(item)} className="bg-teal-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-teal-700 transition w-full">رفع صورة</button>
                    </div>
                )}
            </div>
            <div className="flex-grow w-full">
                <PromptEditor
                    label={item.name}
                    initialValue={item.description}
                    onSave={(newText) => onUpdateDescription(item, type, newText)}
                    rows={5}
                />
            </div>
        </div>
    );
    
    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-8">
                 <div className="flex items-center justify-center gap-4 mb-2">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                        الخطوة 2: بناء عالمك - {title}
                    </h2>
                    <button onClick={onRegenerateDescriptions} disabled={isRegeneratingDescriptions} className="bg-gray-700 hover:bg-gray-600 text-white font-bold p-2 rounded-lg transition flex items-center gap-2 text-sm disabled:bg-gray-800 disabled:cursor-wait">
                         {isRegeneratingDescriptions ? <Spinner size="sm"/> : <RetryIcon/>}
                         <span>{isRegeneratingDescriptions ? 'جاري...' : 'إعادة إنشاء الأوصاف'}</span>
                    </button>
                </div>
                <p className="text-gray-400">عدّل الأوصاف ثم أنشئ أو ارفع صورة مرجعية لكل {type === 'character' ? 'شخصية' : 'موقع'}.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {data.map(item => <ItemCard key={item.name} item={item} />)}
            </div>
            <input type="file" ref={uploadInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <div className="mt-10 flex justify-between items-center">
                <button onClick={onBack} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 flex items-center">
                    <span className="font-sans text-xl">&rarr;</span> <span className="ml-2">رجوع</span>
                </button>
                <button onClick={onNext} disabled={isLoading || !allImagesReady} className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 flex items-center text-lg">
                    {isLoading ? <Spinner size="sm" /> : <span className="font-sans text-xl">&larr;</span>}
                    <span className="mr-2">{isLoading ? 'جاري الإنشاء...' : (type === 'character' ? 'التالي: إعداد المواقع' : 'إنشاء المشاهد')}</span>
                </button>
            </div>
        </div>
    );
};
// --- END: CHARACTER/LOCATION SETUP COMPONENT ---


// --- START: TIMELINE EDITOR COMPONENT ---
const TimelineEditor: React.FC<{
    scenes: Scene[];
    aspectRatio: AspectRatio;
    onGenerateImage: (sceneId: number) => void;
    onGenerateVideo: (sceneId: number) => void;
    onCancelGeneration: (sceneId: number) => void;
    onDownload: (url: string, filename: string) => Promise<void>;
    onUpdatePrompt: (sceneId: number, promptType: 'image' | 'video' | 'dialogue', newText: string) => void;
    onGenerateAudio: (sceneId: number) => void;
    onShowPreview: () => void;
    onDownloadAllPrompts: () => void;
    isDownloadingPrompts: boolean;
    onDownloadAll: () => void;
    isDownloadingAll: boolean;
    onCombineVideos: () => void;
    isCombining: boolean;
    combineProgress: string;
    onBack: () => void;
}> = (props) => {
    return (
        <div className="animate-fade-in-up">
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-gray-700 sticky top-4 z-10 flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                 <button onClick={props.onBack} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg transition flex items-center self-start sm:self-center gap-2">
                    <span className="font-sans text-xl">&rarr;</span> رجوع
                </button>
                <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    محرر الخط الزمني
                </h2>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <button onClick={props.onShowPreview} className="bg-blue-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                        <PlayIcon /> معاينة القصة
                    </button>
                    <button onClick={props.onCombineVideos} disabled={props.isCombining || props.scenes.filter(s=>s.videoUrl).length < 2} className="bg-green-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:bg-green-800 disabled:cursor-not-allowed">
                        {props.isCombining ? <Spinner size="sm" /> : <FilmIcon />} {props.isCombining ? props.combineProgress.substring(0, 20)+'...' : 'دمج الفيديوهات'}
                    </button>
                    <button onClick={props.onDownloadAllPrompts} disabled={props.isDownloadingPrompts} className="bg-gray-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-gray-700 transition flex items-center gap-2 disabled:bg-gray-800">
                        {props.isDownloadingPrompts ? <Spinner size="sm"/> : <DocumentTextIcon/>} البرومبتات
                    </button>
                    <button onClick={props.onDownloadAll} disabled={props.isDownloadingAll} className="bg-gray-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-gray-700 transition flex items-center gap-2 disabled:bg-gray-800">
                        {props.isDownloadingAll ? <Spinner size="sm"/> : <DownloadIcon/>} كل الأصول
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {props.scenes.sort((a,b) => a.scene_number - b.scene_number).map(scene => (
                    <SceneCard
                        key={scene.id}
                        scene={scene}
                        aspectRatio={props.aspectRatio}
                        onGenerateImage={props.onGenerateImage}
                        onRegenerateImage={() => props.onGenerateImage(scene.id)} // Simplified
                        onGenerateVideo={props.onGenerateVideo}
                        onRegenerateVideo={() => props.onGenerateVideo(scene.id)} // Simplified
                        onCancelGeneration={props.onCancelGeneration}
                        onDownload={props.onDownload}
                        onUpdatePrompt={props.onUpdatePrompt}
                        onGenerateAudio={props.onGenerateAudio}
                    />
                ))}
            </div>
        </div>
    );
};
// --- END: TIMELINE EDITOR COMPONENT ---


// --- START: TEMPLATES PAGE COMPONENT ---
const TemplatesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

const templates = [
    { name: 'مغامرة القط المكتشف', idea: 'قط فضولي يجد خريطة قديمة في علية منزله ويذهب في مغامرة للعثور على كنز مخفي في الحديقة الخلفية.' },
    { name: 'صداقة غير متوقعة', idea: 'قطة منعزلة وكلب مرح يصبحان صديقين حميمين بعد أن يساعدها في النزول من شجرة طويلة.' },
    { name: 'رحلة إلى النجوم', idea: 'قطة تحلم بأن تصبح رائدة فضاء، تبني صاروخًا من الورق المقوى وتنطلق في رحلة خيالية عبر الكواكب.' },
    { name: 'لغز السمكة المفقودة', idea: 'عندما تختفي سمكة زينة ثمينة، يجب على قط محقق ذكي تتبع الأدلة للعثور على الجاني.' },
    { name: 'القط الشبح', idea: 'في ليلة عاصفة، يكتشف قط شجاع شبحًا ودودًا في منزله ويتعاونان معًا لإخافة لص.' },
    { name: 'مسابقة المواهب', idea: 'قط موهوب يقرر المشاركة في مسابقة المواهب للحيوانات الأليفة في المدينة، لكنه يواجه منافسة شرسة.' },
];

const TemplatesPage: React.FC<{ onSelectTemplate: (idea: string) => void }> = ({ onSelectTemplate }) => (
    <div className="animate-fade-in-up">
        <h2 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
            ابدأ من قالب
        </h2>
        <p className="text-center text-gray-400 mb-8">اختر فكرة قصة جاهزة لتسريع عمليتك الإبداعية.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
                <div key={template.name} onClick={() => onSelectTemplate(template.idea)} className="bg-gray-800/50 rounded-lg overflow-hidden cursor-pointer transition-transform transform hover:scale-105 hover:border-teal-500 border-2 border-transparent group">
                    <div className="w-full h-40 bg-gray-700/50 flex items-center justify-center transition-colors group-hover:bg-gray-700">
                        <SparklesIcon />
                    </div>
                    <div className="p-4">
                        <h3 className="font-bold text-lg text-gray-100">{template.name}</h3>
                        <p className="text-sm text-gray-400 mt-1 h-12 overflow-hidden">{template.idea}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);
// --- END: TEMPLATES PAGE COMPONENT ---


// --- START: BOTTOM NAV BAR COMPONENT ---
const BottomNavBar: React.FC<{
    activeTab: 'projects' | 'templates';
    setActiveTab: (tab: 'projects' | 'templates') => void;
}> = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'projects', label: 'المشاريع', icon: <FolderIcon /> },
        { id: 'templates', label: 'القوالب', icon: <TemplatesIcon /> },
    ];
    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-lg border-t border-gray-700 shadow-2xl z-20">
            <div className="flex justify-around items-center h-16">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id as any)}
                        className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${
                            activeTab === item.id ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        {React.cloneElement(item.icon, { className: 'h-6 w-6' })}
                        <span className="text-xs mt-1 font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};
// --- END: BOTTOM NAV BAR COMPONENT ---


const App: React.FC = () => {
    const [apiKeys, setApiKeys] = useState<string[]>([]);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [appState, setAppState] = useState<AppState>(initialAppState);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    const debounceTimeoutRef = useRef<number | null>(null);
    const ffmpegLoaded = useRef(false);
    
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isImproving, setIsImproving] = useState<boolean>(false);
    const [isRegeneratingDescriptions, setIsRegeneratingDescriptions] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCombining, setIsCombining] = useState(false);
    const [combineProgress, setCombineProgress] = useState('');
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [isDownloadingPrompts, setIsDownloadingPrompts] = useState(false);

    const [activeTab, setActiveTab] = useState<'projects' | 'templates'>('projects');

    useEffect(() => {
        const storedKeys = JSON.parse(localStorage.getItem('gemini-api-keys') || '[]');
        if (storedKeys.length > 0) {
            setApiKeys(storedKeys);
            initializeAi(storedKeys);
        } else {
            setIsApiKeyModalOpen(true);
        }

        const storedProjects: Project[] = JSON.parse(localStorage.getItem('story_generator_projects') || '[]');
        setProjects(storedProjects);

        const lastProjectId = localStorage.getItem('story_generator_last_project_id');
        if (lastProjectId && storedProjects.find(p => p.id === lastProjectId)) {
            loadProject(lastProjectId, storedProjects);
        } else if (storedProjects.length > 0) {
            loadProject(storedProjects[0].id, storedProjects);
        } else {
            createNewProject(undefined, []);
        }
    }, []);

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        if (currentProjectId) {
            debounceTimeoutRef.current = window.setTimeout(() => {
                saveProject(currentProjectId, appState);
            }, 1000);
        }
    }, [appState, currentProjectId]);

    const { storyIdea, duration, aspectRatio, style, characterPrompts, scenes, currentStep } = appState;

    const updateState = (updates: Partial<AppState>) => {
        // When story idea changes, reset subsequent data
        if ('storyIdea' in updates) {
             setAppState(prevState => ({ 
                ...initialAppState, 
                // Keep settings from previous state
                duration: prevState.duration,
                aspectRatio: prevState.aspectRatio,
                style: prevState.style,
                // Apply new story idea
                storyIdea: updates.storyIdea!, 
            }));
        } else {
            setAppState(prevState => ({ ...prevState, ...updates }));
        }
    };
    
    const updateScene = (sceneId: number, updates: Partial<Scene>) => {
        updateState({
            scenes: appState.scenes.map(scene =>
                scene.id === sceneId ? { ...scene, ...updates } : scene
            )
        });
    };

    const handleSaveApiKeys = (keys: string[]) => {
        setApiKeys(keys);
        localStorage.setItem('gemini-api-keys', JSON.stringify(keys));
        initializeAi(keys);
        setIsApiKeyModalOpen(false);
    };

    const createNewProject = (stateOverrides: Partial<AppState> = {}, currentProjects = projects) => {
        const finalInitialState = { ...initialAppState, ...stateOverrides };
        const newProject: Project = {
            id: `proj_${Date.now()}`,
            name: stateOverrides.storyIdea?.substring(0, 30).trim() || 'مشروع جديد',
            state: finalInitialState,
            lastSaved: Date.now(),
        };
        const updatedProjects = [...currentProjects, newProject];
        setProjects(updatedProjects);
        setCurrentProjectId(newProject.id);
        setAppState(finalInitialState);
        localStorage.setItem('story_generator_projects', JSON.stringify(updatedProjects));
        localStorage.setItem('story_generator_last_project_id', newProject.id);
    };

    const saveProject = (projectId: string, state: AppState) => {
        const updatedProjects = projects.map(p =>
            p.id === projectId ? { ...p, state, name: state.storyIdea.substring(0, 30).trim() || p.name, lastSaved: Date.now() } : p
        );
        setProjects(updatedProjects);
        localStorage.setItem('story_generator_projects', JSON.stringify(updatedProjects));
    };

    const loadProject = (id: string, currentProjects = projects) => {
        const projectToLoad = currentProjects.find(p => p.id === id);
        if (projectToLoad) {
            setAppState(projectToLoad.state);
            setCurrentProjectId(id);
            localStorage.setItem('story_generator_last_project_id', id);
        }
    };

    const deleteProject = (id: string) => {
        const updatedProjects = projects.filter(p => p.id !== id);
        setProjects(updatedProjects);
        localStorage.setItem('story_generator_projects', JSON.stringify(updatedProjects));
        if (currentProjectId === id) {
            if (updatedProjects.length > 0) {
                loadProject(updatedProjects.sort((a,b) => b.lastSaved - a.lastSaved)[0].id, updatedProjects);
            } else {
                createNewProject(undefined, []);
            }
        }
    };

    const renameProject = (id: string, newName: string) => {
        const updatedProjects = projects.map(p => p.id === id ? { ...p, name: newName } : p);
        setProjects(updatedProjects);
        localStorage.setItem('story_generator_projects', JSON.stringify(updatedProjects));
    };

    const exportProject = (id: string) => {
        const projectToExport = projects.find(p => p.id === id);
        if (projectToExport) {
            const blob = new Blob([JSON.stringify(projectToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            downloadFile(url, `${projectToExport.name.replace(/\s+/g, '_')}.json`);
        }
    };

    const importProject = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const project = JSON.parse(event.target?.result as string) as Project;
                if (project.id && project.name && project.state) {
                    const updatedProjects = [...projects.filter(p => p.id !== project.id), project];
                    setProjects(updatedProjects);
                    localStorage.setItem('story_generator_projects', JSON.stringify(updatedProjects));
                    loadProject(project.id, updatedProjects);
                } else {
                    setError("ملف المشروع غير صالح.");
                }
            } catch (e) {
                setError("فشل في قراءة ملف المشروع.");
                console.error(e);
            }
        };
        reader.readAsText(file);
    };

    const improveStoryWithAi = async () => {
        setIsImproving(true);
        setError(null);
        try {
            const improved = await improveStory(appState.storyIdea);
            updateState({ storyIdea: improved });
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsImproving(false);
        }
    };

    const handleAnalyzeStory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const prompts = await generateCharacterPrompts(storyIdea, style);
            updateState({ characterPrompts: prompts, currentStep: 'characters' });
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRegenerateDescriptions = async () => {
        setIsRegeneratingDescriptions(true);
        setError(null);
        try {
            const prompts = await generateCharacterPrompts(storyIdea, style);
            updateState({ characterPrompts: prompts });
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsRegeneratingDescriptions(false);
        }
    };
    
    const updateCharacterOrLocation = (
        itemName: string,
        type: 'character' | 'location',
        updates: Partial<CharacterPrompt | LocationPrompt>
    ) => {
        if (!appState.characterPrompts) return;
        const updatedPrompts = JSON.parse(JSON.stringify(appState.characterPrompts));
        const list = type === 'character' ? updatedPrompts.characters : updatedPrompts.locations;
        const itemIndex = list.findIndex((i: CharacterPrompt | LocationPrompt) => i.name === itemName);
        if (itemIndex > -1) {
            list[itemIndex] = { ...list[itemIndex], ...updates };
        }
        updateState({ characterPrompts: updatedPrompts });
    };

    const handleUpdateCharacterDescription = (
        item: CharacterPrompt | LocationPrompt,
        type: 'character' | 'location',
        newDescription: string
    ) => {
        updateCharacterOrLocation(item.name, type, { description: newDescription });
    };

    const handleGenerateCharacterImage = async (item: CharacterPrompt | LocationPrompt, type: 'character' | 'location') => {
        const abortController = new AbortController();
        updateCharacterOrLocation(item.name, type, { isGenerating: true, abortController });
        setError(null);
        
        try {
            const imageBase64 = await generateImage(item.description, aspectRatio, abortController.signal);
            const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
            updateCharacterOrLocation(item.name, type, { isGenerating: false, imageUrl, abortController: undefined });
        } catch (e) {
            if ((e as Error).name !== 'AbortError') {
                setError((e as Error).message);
            }
            updateCharacterOrLocation(item.name, type, { isGenerating: false, abortController: undefined });
        }
    };
    
    const handleCancelCharacterImageGeneration = (item: CharacterPrompt | LocationPrompt, type: 'character' | 'location') => {
        const charPrompts = appState.characterPrompts;
        if (!charPrompts) return;
        
        const list = type === 'character' ? charPrompts.characters : charPrompts.locations;
        const currentItem = list.find(i => i.name === item.name);

        currentItem?.abortController?.abort();
        updateCharacterOrLocation(item.name, type, { isGenerating: false, abortController: undefined });
    };

    const handleUploadCharacterImage = async (item: CharacterPrompt | LocationPrompt, type: 'character' | 'location', file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const imageUrl = reader.result as string;
            updateCharacterOrLocation(item.name, type, { imageUrl });
        };
        reader.readAsDataURL(file);
    };

    const handleGenerateScenePrompts = async () => {
        if (!characterPrompts) return;
        setIsLoading(true);
        setError(null);
        try {
            const rawScenes = await generateScenePrompts(storyIdea, duration, characterPrompts, aspectRatio, style);
            const newScenes: Scene[] = rawScenes.map((raw, index) => ({
                ...raw,
                id: Date.now() + index,
            }));
            updateState({ scenes: newScenes, currentStep: 'timeline' });
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePrompt = (sceneId: number, promptType: 'image' | 'video' | 'dialogue', newText: string) => {
        const key = promptType === 'dialogue' ? 'dialogue' : `${promptType}_prompt`;
        updateScene(sceneId, { [key]: newText });
    };

    const handleGenerateSceneImage = async (sceneId: number) => {
        const scene = scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        updateScene(sceneId, { isGeneratingImage: true });
        setError(null);

        try {
            const imageBase64 = await generateImage(scene.image_prompt, aspectRatio);
            updateScene(sceneId, { imageUrl: `data:image/jpeg;base64,${imageBase64}`, isGeneratingImage: false });
        } catch (e) {
            setError((e as Error).message);
            updateScene(sceneId, { isGeneratingImage: false });
        }
    };

    const handleGenerateSceneVideo = async (sceneId: number) => {
        const scene = scenes.find(s => s.id === sceneId);
        if (!scene || !scene.imageUrl) return;

        const abortController = new AbortController();
        updateScene(sceneId, { isVideoGenerating: true, abortController });
        setError(null);
        
        try {
            const imageBase64 = scene.imageUrl.split(',')[1];
            const videoUrl = await generateVideo(scene.video_prompt, imageBase64, abortController.signal);
            updateScene(sceneId, { videoUrl, isVideoGenerating: false, abortController: undefined });
        } catch (e) {
            if ((e as Error).name !== 'AbortError') {
                setError((e as Error).message);
            }
            updateScene(sceneId, { isVideoGenerating: false, abortController: undefined });
        }
    };

    const handleCancelGeneration = (sceneId: number) => {
        const scene = scenes.find(s => s.id === sceneId);
        scene?.abortController?.abort();
        updateScene(sceneId, { isVideoGenerating: false, isGeneratingImage: false, abortController: undefined });
    };
    
    const handleGenerateAudio = (sceneId: number) => {
        const scene = appState.scenes.find(s => s.id === sceneId);
        if (!scene || scene.isAudioGenerating) return;

        updateScene(sceneId, { isAudioGenerating: true });
        
        const utterance = new SpeechSynthesisUtterance(scene.dialogue);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.9;
        
        utterance.onend = () => {
            updateScene(sceneId, { isAudioGenerating: false });
        };
        
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            setError(`فشل توليد الصوت: ${event.error}`);
            updateScene(sceneId, { isAudioGenerating: false });
        };
        
        window.speechSynthesis.speak(utterance);
    };
    
    const handleDownloadAllPrompts = () => {
        setIsDownloadingPrompts(true);
        const allPrompts = scenes.map(scene => `
## المشهد ${scene.scene_number}

### برومبت الصورة
${scene.image_prompt}

### برومبت الفيديو
${scene.video_prompt}

### الحوار (${scene.character_name})
${scene.dialogue}
        `).join('\n---\n');
        
        const blob = new Blob([allPrompts], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        downloadFile(url, `${storyIdea.substring(0,20).replace(/\s/g, '_')}_prompts.txt`);
        setIsDownloadingPrompts(false);
    };

    const handleDownloadAllAssets = async () => {
        setIsDownloadingAll(true);
        for (const scene of scenes.sort((a,b) => a.scene_number - b.scene_number)) {
            if (scene.imageUrl) {
                await downloadFile(scene.imageUrl, `scene_${scene.scene_number}_image.jpeg`);
            }
            if (scene.videoUrl) {
                await downloadFile(scene.videoUrl, `scene_${scene.scene_number}_video.mp4`);
            }
        }
        setIsDownloadingAll(false);
    };

    const handleCombineVideos = async () => {
        if (!ffmpegLoaded.current) {
            try {
                await loadFfmpeg();
                ffmpegLoaded.current = true;
            } catch (error) {
                setError("Failed to load FFmpeg library. Please check your network connection and try again.");
                return;
            }
        }
        
        setIsCombining(true);
        setCombineProgress('Loading FFmpeg...');
        const ffmpeg = new FFmpeg.FFmpeg();
        
        ffmpeg.on('log', ({ message }: { message: string }) => {
            console.log(message);
            setCombineProgress(message);
        });

        try {
            await ffmpeg.load({
                coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js"
            });
            setCombineProgress('FFmpeg loaded. Processing videos...');

            const videoScenes = scenes.filter(s => s.videoUrl).sort((a,b) => a.scene_number - b.scene_number);
            let fileList = '';

            for (let i = 0; i < videoScenes.length; i++) {
                const scene = videoScenes[i];
                const filename = `input${i}.mp4`;
                await ffmpeg.writeFile(filename, await FFmpegUtil.fetchFile(scene.videoUrl!));
                fileList += `file '${filename}'\n`;
            }
            
            await ffmpeg.writeFile('filelist.txt', fileList);
            setCombineProgress('Combining videos...');

            await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'filelist.txt', '-c', 'copy', 'output.mp4']);
            
            setCombineProgress('Finalizing...');
            const data = await ffmpeg.readFile('output.mp4');
            const blob = new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            downloadFile(url, `${storyIdea.substring(0, 20).replace(/\s+/g, '_')}_final.mp4`);

        } catch (e) {
            setError('An error occurred during video combination.');
            console.error(e);
        } finally {
            setIsCombining(false);
            setCombineProgress('');
        }
    };
    
    const renderContent = () => {
        switch (currentStep) {
            case 'dashboard':
                return (
                    <div className="sm:grid sm:grid-cols-[1fr_300px] sm:gap-8">
                        <div className="order-2 sm:order-1">
                            {activeTab === 'projects' ? (
                                <Dashboard
                                    appState={appState}
                                    updateState={updateState}
                                    onAnalyze={handleAnalyzeStory}
                                    isLoading={isLoading}
                                    projects={projects}
                                    currentProjectId={currentProjectId}
                                    onLoadProject={(id) => loadProject(id)}
                                    onNewProject={() => createNewProject()}
                                    onDeleteProject={deleteProject}
                                    onRenameProject={renameProject}
                                    onExportProject={exportProject}
                                    onImportProject={importProject}
                                    improveStoryWithAi={improveStoryWithAi}
                                    isImproving={isImproving}
                                />
                            ) : (
                                <TemplatesPage onSelectTemplate={(idea) => createNewProject({ storyIdea: idea })} />
                            )}
                        </div>
                        <aside className="hidden sm:block order-1 sm:order-2">
                             <h2 className="text-lg font-bold mb-4">التنقل</h2>
                             <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                <button onClick={() => setActiveTab('projects')} className={`w-full text-right p-3 rounded-md transition ${activeTab === 'projects' ? 'bg-purple-600/50 text-white' : 'hover:bg-gray-700'}`}>المشاريع</button>
                                <button onClick={() => setActiveTab('templates')} className={`w-full text-right p-3 mt-2 rounded-md transition ${activeTab === 'templates' ? 'bg-purple-600/50 text-white' : 'hover:bg-gray-700'}`}>القوالب</button>
                             </div>
                        </aside>
                    </div>
                );
            case 'characters':
                return <CharacterLocationSetup
                    type="character"
                    prompts={characterPrompts}
                    onGenerateImage={handleGenerateCharacterImage}
                    onUploadImage={handleUploadCharacterImage}
                    onUpdateDescription={handleUpdateCharacterDescription}
                    onCancelGeneration={handleCancelCharacterImageGeneration}
                    onRegenerateDescriptions={handleRegenerateDescriptions}
                    isRegeneratingDescriptions={isRegeneratingDescriptions}
                    onBack={() => updateState({ currentStep: 'dashboard' })}
                    onNext={() => updateState({ currentStep: 'locations' })}
                    isLoading={isLoading}
                />;
            case 'locations':
                return <CharacterLocationSetup
                    type="location"
                    prompts={characterPrompts}
                    onGenerateImage={handleGenerateCharacterImage}
                    onUploadImage={handleUploadCharacterImage}
                    onUpdateDescription={handleUpdateCharacterDescription}
                    onCancelGeneration={handleCancelCharacterImageGeneration}
                    onRegenerateDescriptions={handleRegenerateDescriptions}
                    isRegeneratingDescriptions={isRegeneratingDescriptions}
                    onBack={() => updateState({ currentStep: 'characters' })}
                    onNext={handleGenerateScenePrompts}
                    isLoading={isLoading}
                />;
            case 'timeline':
                return <TimelineEditor
                    scenes={scenes}
                    aspectRatio={aspectRatio}
                    onGenerateImage={handleGenerateSceneImage}
                    onGenerateVideo={handleGenerateSceneVideo}
                    onCancelGeneration={handleCancelGeneration}
                    onDownload={downloadFile}
                    onUpdatePrompt={handleUpdatePrompt}
                    onGenerateAudio={handleGenerateAudio}
                    onShowPreview={() => setIsPreviewModalOpen(true)}
                    onDownloadAllPrompts={handleDownloadAllPrompts}
                    isDownloadingPrompts={isDownloadingPrompts}
                    onDownloadAll={handleDownloadAllAssets}
                    isDownloadingAll={isDownloadingAll}
                    onCombineVideos={handleCombineVideos}
                    isCombining={isCombining}
                    combineProgress={combineProgress}
                    onBack={() => updateState({ currentStep: 'locations' })}
                />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0014] text-gray-200">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/20 via-transparent to-transparent -z-10"></div>
            <Header onShowSettings={() => setIsApiKeyModalOpen(true)} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6 animate-fade-in" role="alert">
                        <strong className="font-bold">خطأ! </strong>
                        <span className="block sm:inline">{error}</span>
                        <span className="absolute top-0 bottom-0 right-0 px-4 py-3 rtl:right-auto rtl:left-0 cursor-pointer" onClick={() => setError(null)}>
                            <svg className="fill-current h-6 w-6 text-red-200" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                        </span>
                    </div>
                )}
                {renderContent()}
            </main>
            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setIsApiKeyModalOpen(false)}
                onSave={handleSaveApiKeys}
                currentKeys={apiKeys}
            />
            <PreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                scenes={scenes}
            />
             {currentStep === 'dashboard' && <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />}
        </div>
    );
};

export default App;
