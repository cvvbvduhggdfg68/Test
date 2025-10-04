import React, { useState, useRef } from 'react';
import type { Project } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    currentProjectId: string | null;
    onLoad: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
    onRename: (id: string, newName: string) => void;
    onExport: (id: string) => void;
    onImport: (file: File) => void;
}

const ProjectRow: React.FC<{
    project: Project;
    isCurrent: boolean;
    onLoad: () => void;
    onDelete: () => void;
    onRename: (newName: string) => void;
    onExport: () => void;
}> = ({ project, isCurrent, onLoad, onDelete, onRename, onExport }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(project.name);

    const handleRename = () => {
        if (name.trim() && name !== project.name) {
            onRename(name.trim());
        }
        setIsEditing(false);
    };

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isCurrent ? 'bg-purple-900/50' : 'hover:bg-gray-700/50'}`}>
            <div className="flex-grow">
                {isEditing ? (
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm w-full"
                        autoFocus
                    />
                ) : (
                    <span className="font-semibold text-gray-200 cursor-pointer" onDoubleClick={() => setIsEditing(true)}>
                        {project.name}
                    </span>
                )}
                <p className="text-xs text-gray-500">{new Date(project.lastSaved).toLocaleString()}</p>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
                <button
                    onClick={onLoad}
                    disabled={isCurrent}
                    className="bg-green-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                >
                    {isCurrent ? 'الحالي' : 'تحميل'}
                </button>
                 <button onClick={onExport} className="p-2 text-gray-400 hover:text-sky-400 rounded-full hover:bg-gray-700 transition" title="تصدير المشروع">
                    <DownloadIcon />
                </button>
                 <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-700 transition">
                    <TrashIcon />
                </button>
            </div>
        </div>
    );
};

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, projects, currentProjectId, onLoad, onNew, onDelete, onRename, onExport, onImport }) => {
    const importInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImport(file);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl m-4 flex flex-col"
                style={{ maxHeight: '80vh' }}
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 sm:p-6 border-b border-gray-700 flex justify-between items-center flex-wrap gap-2">
                    <h2 className="text-2xl font-bold text-purple-300">إدارة المشاريع</h2>
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <button onClick={handleImportClick} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center">
                            <UploadIcon />
                            <span className="mr-2">استيراد</span>
                        </button>
                        <input
                            type="file"
                            ref={importInputRef}
                            onChange={handleFileChange}
                            accept="application/json"
                            className="hidden"
                        />
                        <button onClick={onNew} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center">
                            <PlusIcon />
                            <span className="mr-2">مشروع جديد</span>
                        </button>
                    </div>
                </header>

                <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
                    {projects.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">لا توجد مشاريع محفوظة. ابدأ مشروعًا جديدًا!</p>
                    ) : (
                        <div className="space-y-3">
                            {projects.sort((a, b) => b.lastSaved - a.lastSaved).map(p => (
                                <ProjectRow
                                    key={p.id}
                                    project={p}
                                    isCurrent={p.id === currentProjectId}
                                    onLoad={() => onLoad(p.id)}
                                    onDelete={() => onDelete(p.id)}
                                    onRename={(newName) => onRename(p.id, newName)}
                                    onExport={() => onExport(p.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <footer className="p-4 border-t border-gray-700 text-right">
                     <button 
                        onClick={onClose}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        إغلاق
                    </button>
                </footer>
            </div>
        </div>
    );
};
