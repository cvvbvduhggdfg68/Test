
import { GoogleGenAI, Type } from "@google/genai";
import type { RawScene, CharacterAndLocationPrompts, AspectRatio } from '../types';

let apiKeys: string[] = [];
let currentKeyIndex = 0;

function processApiError(error: any): Error {
    console.error("Gemini Service Error:", error);

    if (error && error.name === 'AbortError') {
        return error;
    }

    let detailedMessage = "An unknown error occurred.";
    let errorStatus = "";

    // Extract message and status from various possible error structures
    if (error instanceof Error) {
        detailedMessage = error.message;
    } else if (typeof error === 'string') {
        detailedMessage = error;
    } else if (error && typeof error === 'object') {
        if (error.error && typeof error.error === 'object') { // Google API error wrapper
            detailedMessage = error.error.message || JSON.stringify(error.error);
            errorStatus = error.error.status || "";
        } else if (error.message) { // Standard error object
            detailedMessage = error.message;
        } else {
            try {
                detailedMessage = JSON.stringify(error);
            } catch {
                detailedMessage = String(error);
            }
        }
    }
    
    // Check for quota exhaustion
    if (errorStatus === "RESOURCE_EXHAUSTED" || detailedMessage.includes("RESOURCE_EXHAUSTED") || detailedMessage.includes("Quota exceeded")) {
        return new Error("QUOTA_EXHAUSTED");
    } 
    
    // Other specific errors
    if (detailedMessage.includes("API key not valid")) {
        return new Error("The API key you entered is invalid. Please check it and re-enter it in the settings.");
    }
    if (detailedMessage.includes("timed out")) {
        return new Error("The request timed out. There may be a network issue or service congestion. Please try again later.");
    }
    if (detailedMessage.toUpperCase().includes("SAFETY")) {
        return new Error("Content was blocked due to safety policies. Please try modifying the prompt.");
    }
    
    return new Error(`An API error occurred: ${detailedMessage}`);
}

export function initializeAi(keys: string[]) {
    if (!keys || keys.length === 0) {
        apiKeys = [];
        console.warn("API keys are not provided. AI services will be disabled.");
        return;
    }
    apiKeys = keys;
    currentKeyIndex = Math.floor(Math.random() * apiKeys.length); // Start with a random key
}

async function executeApiCall<T>(apiAction: (ai: GoogleGenAI, key: string, signal?: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (apiKeys.length === 0) {
        throw new Error("AI Service not initialized. Please enter your API key in the settings.");
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const exhaustedKeys = new Set<string>();

    for (let i = 0; i < apiKeys.length; i++) {
        const key = apiKeys[currentKeyIndex];
        
        if (exhaustedKeys.has(key)) {
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            continue;
        }

        const ai = new GoogleGenAI({ apiKey: key });

        try {
            const result = await apiAction(ai, key, signal);
            return result;
        } catch (error) {
            const processedError = processApiError(error);
            if (processedError.message === "QUOTA_EXHAUSTED") {
                console.warn(`API key ending in ...${key.slice(-4)} has exceeded its quota. Trying next key.`);
                exhaustedKeys.add(key);
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            } else {
                throw processedError;
            }
        }
    }

    throw new Error("All available API keys have exceeded their quota. Please add new keys in the settings.");
}

export async function improveStory(storyIdea: string, signal?: AbortSignal): Promise<string> {
    return executeApiCall(async (ai) => {
        const prompt = `You are a creative writer. Refine and enhance the following story idea to make it more vivid, engaging, and suitable for a short animated video. Keep the core concept but expand on it with more descriptive details.

        Original Idea: "${storyIdea}"
        
        Your response should be only the improved story text.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        }, { signal });
        
        return response.text.trim();
    });
}

export async function generateCharacterPrompts(storyIdea: string, style: string, signal?: AbortSignal): Promise<CharacterAndLocationPrompts> {
    return executeApiCall(async (ai) => {
        const prompt = `
        Based on the following story idea, create detailed visual descriptions for the main characters and key locations.
        The overall style for all descriptions MUST BE '${style}'.
        The descriptions should be rich and evocative, ready to be used in an image generation model.
        For each CHARACTER, describe them in a neutral pose against a simple, solid-colored background to create a clear visual reference.

        Story Idea: "${storyIdea}"

        Your response MUST be a JSON object with two keys: "characters" and "locations".
        - "characters" should be an array of objects, where each object has a "name" (string in Arabic) and a "description" (string).
        - "locations" should be an array of objects, where each object has a "name" (string in Arabic) and a "description" (string).
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        characters: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                },
                                required: ["name", "description"]
                            }
                        },
                        locations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                },
                                required: ["name", "description"]
                            }
                        }
                    },
                    required: ["characters", "locations"]
                }
            }
        }, { signal });
        const jsonText = response.text.trim();
        const prompts: CharacterAndLocationPrompts = JSON.parse(jsonText);
        return prompts;
    });
}


export async function generateScenePrompts(storyIdea: string, duration: number, characterDescriptions: CharacterAndLocationPrompts, aspectRatio: string, style: string, signal?: AbortSignal): Promise<RawScene[]> {
    return executeApiCall(async (ai) => {
        const sceneCount = Math.ceil(duration / 8); // Each scene is conceptually 8 seconds long

        let characterDescriptionsText = "Characters:\n";
        characterDescriptions.characters.forEach(char => {
            characterDescriptionsText += `- ${char.name}: ${char.description}\n`;
        });
        characterDescriptionsText += "\nLocations:\n";
        characterDescriptions.locations.forEach(loc => {
            characterDescriptionsText += `- ${loc.name}: ${loc.description}\n`;
        });

        const prompt = `
        I am creating a short video, ${duration} seconds long, with an aspect ratio of ${aspectRatio}.
        The story is about: "${storyIdea}".

        ---
        **CRITICAL INSTRUCTION: VISUAL CONSISTENCY**
        The following are the official, locked-in visual descriptions for the characters and locations. You MUST adhere to these descriptions with absolute strictness, as if they are an unbreakable rule. DO NOT deviate, add, or change any visual aspect. The scenes you generate must look like they belong in the same world as defined below.
        ${characterDescriptionsText}
        ---

        **TASK**
        Break the story into ${sceneCount} scenes. For each scene, provide a complete JSON object with the following keys:

        1.  "scene_number": The sequence number of the scene.
        2.  "image_prompt": A highly detailed description for a single still frame. The style is '${style}'. Focus on character expressions, posture, lighting, and a clear camera angle (e.g., 'close-up shot', 'wide angle shot'). **Crucially, ensure the visual details of characters and locations match their descriptions above EXACTLY.**
        3.  "video_prompt": A description for a 3-5 second animation based on the image prompt. Describe **simple, professional, and subtle** actions and camera movements. The goal is smooth, cinematic motion suitable for professional animation.
            *   **GOOD EXAMPLES:** 'slow pan right', 'gentle zoom in', 'static shot where the character blinks slowly', 'subtle head turn towards the camera'.
            *   **AVOID:** 'running and jumping quickly', 'fast camera pans', 'complex fight scenes', 'explosions', 'shaky camera'.
        4.  "character_name": The name of the character speaking in ARABIC. If it is a narrator, use "الراوي".
        5.  "dialogue": A single, short line of dialogue in ARABIC that fits the scene's emotion and context.

        Your entire response must be a valid JSON array of these scene objects.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            scene_number: { type: Type.INTEGER },
                            image_prompt: { type: Type.STRING },
                            video_prompt: { type: Type.STRING },
                            character_name: { type: Type.STRING },
                            dialogue: { type: Type.STRING }
                        },
                        required: ["scene_number", "image_prompt", "video_prompt", "character_name", "dialogue"],
                    },
                },
            },
        }, { signal });
        
        const jsonText = response.text.trim();
        const scenes: RawScene[] = JSON.parse(jsonText);
        return scenes;
    });
}

export async function generateImage(prompt: string, aspectRatio: string, signal?: AbortSignal): Promise<string> {
    return executeApiCall(async (ai) => {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            },
        }, { signal });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return base64ImageBytes;
        } else {
            throw new Error("No image was generated by the API.");
        }
    });
}

export async function generateVideo(videoPrompt: string, imageBase64: string, signal: AbortSignal): Promise<string> {
    console.log("Starting video generation...");
    return executeApiCall(async (ai, key) => {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: videoPrompt,
            image: {
                imageBytes: imageBase64,
                mimeType: 'image/jpeg',
            },
            config: {
                numberOfVideos: 1,
            }
        }, { signal });
        
        console.log("Video generation initiated. Polling for completion...");

        while (!operation.done) {
            if (signal.aborted) {
                // There's no official cancel API for the operation itself, but we stop polling.
                throw new DOMException('Aborted', 'AbortError');
            }
            await new Promise(resolve => setTimeout(resolve, 10000));
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            operation = await ai.operations.getVideosOperation({ operation: operation });
            console.log("Polling... Current status:", operation.name, "Done:", operation.done);
        }

        console.log("Video generation completed.");
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (downloadLink) {
            const fetchUrl = `${downloadLink}&key=${key}`;
            console.log("Fetching video from:", fetchUrl);
            const response = await fetch(fetchUrl, { signal });
            if (!response.ok) {
                throw new Error(`Failed to download video file: ${response.statusText}`);
            }
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            console.log("Video Object URL created:", objectUrl);
            return objectUrl;
        } else {
            console.error("Video operation finished, but no download link was found.", operation.response);
            throw new Error("Video generation succeeded but no download link was provided.");
        }
    }, signal);
}
