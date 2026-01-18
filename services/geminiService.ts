import { GoogleGenAI } from "@google/genai";
import { GenerateVideoResult } from "../types";

/**
 * Checks if the user has selected an API key via the AI Studio overlay.
 */
export const checkApiKeyAvailability = async (): Promise<boolean> => {
  if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
    return await window.aistudio.hasSelectedApiKey();
  }
  return false;
};

/**
 * Opens the API Key selection dialog.
 */
export const promptApiKeySelection = async (): Promise<void> => {
  if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
    await window.aistudio.openSelectKey();
  } else {
    console.error("AI Studio overlay not found.");
    throw new Error("AI Studio environment not detected.");
  }
};

/**
 * Generates a video using the Veo model.
 * Handles polling and fetching the final video blob.
 */
export const generateVideoWithVeo = async (prompt: string): Promise<GenerateVideoResult> => {
  // Always create a new instance to ensure the latest selected key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Use the fast preview model as requested, configured for 1080p
  // Note: 'veo-3.1-fast-generate-preview' is generally faster, but 'veo-3.1-generate-preview' 
  // allows higher fidelity if needed. The prompt asked for "Veo 3 1080p".
  // The fast model supports 1080p and is better for a bulk tool.
  const modelName = 'veo-3.1-fast-generate-preview';

  try {
    let operation = await ai.models.generateVideos({
      model: modelName,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9' // Standard cinematic ratio
      }
    });

    // Poll until complete
    while (!operation.done) {
      // Wait 5 seconds between polls to avoid aggressive rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // Check for URI in response
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
      throw new Error("Video generation completed but no URI was returned.");
    }

    // Fetch the actual video content
    // We must append the API key to the download link as per documentation
    const downloadUrl = `${videoUri}&key=${process.env.API_KEY}`;
    
    const videoResponse = await fetch(downloadUrl);
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const blob = await videoResponse.blob();
    const objectUrl = URL.createObjectURL(blob);

    return {
      videoUrl: objectUrl,
      videoBlob: blob
    };

  } catch (error: any) {
    // If we hit a specific "Entity not found" error, it often means the API key selection state is invalid.
    if (error.message && error.message.includes("Requested entity was not found")) {
        // Trigger a re-selection flow if possible, or just throw specific error
        throw new Error("API Key session expired or invalid. Please re-select your key.");
    }
    console.error("Veo Generation Error:", error);
    throw error;
  }
};