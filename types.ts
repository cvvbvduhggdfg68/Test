
export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:3' | '3:4';

export interface CharacterPrompt {
    name: string;
    description: string;
    imageUrl?: string;
    isGenerating?: boolean;
    abortController?: AbortController;
}

export interface LocationPrompt {
    name: string;
    description: string;
    imageUrl?: string;
    isGenerating?: boolean;
    abortController?: AbortController;
}

export interface CharacterAndLocationPrompts {
    characters: CharacterPrompt[];
    locations: LocationPrompt[];
}

export interface Scene {
    id: number;
    scene_number: number;
    image_prompt: string;
    video_prompt: string;
    dialogue: string;
    character_name: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string; 
    isGeneratingImage?: boolean;
    isVideoGenerating?: boolean;
    isAudioGenerating?: boolean;
    abortController?: AbortController;
}

export interface RawScene {
    scene_number: number;
    image_prompt: string;
    video_prompt: string;
    dialogue: string;
    character_name: string;
}

export type StepName = 'dashboard' | 'characters' | 'locations' | 'timeline';

export interface AppState {
    storyIdea: string;
    duration: number;
    aspectRatio: AspectRatio;
    style: string;
    characterPrompts: CharacterAndLocationPrompts | null;
    scenes: Scene[];
    currentStep: StepName;
}

export interface Project {
    id: string;
    name: string;
    state: AppState;
    lastSaved: number;
}
