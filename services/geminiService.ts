import { GoogleGenAI, Type } from "@google/genai";
import { Subject, ConceptGraphData } from "../types";
import { SYSTEM_INSTRUCTIONS } from "../constants";

const getApiKey = () => {
  // Prioritize environment variable (injected by Vite)
  if (process.env.API_KEY) return process.env.API_KEY;
  
  // Fallback to local storage
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('lumina_api_key') || '';
  }
  return '';
};

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private apiKey: string = '';

  constructor() {
    const key = getApiKey();
    if (key) {
      this.apiKey = key;
      this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  hasKey(): boolean {
    const key = getApiKey();
    return !!key;
  }

  // Allow updating the API key at runtime
  setApiKey(key: string) {
    if (!key) return;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lumina_api_key', key);
    }
    this.apiKey = key;
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  private getClient(): GoogleGenAI {
    // Try to recover key from storage if instance is null
    if (!this.ai) {
      const key = getApiKey();
      if (key) {
        this.setApiKey(key);
      } else {
        throw new Error("API_KEY_MISSING");
      }
    }
    
    // Double check we have an instance now
    if (!this.ai) {
       throw new Error("API_KEY_MISSING");
    }
    
    return this.ai;
  }

  // Helper to determine model based on subject
  private getModelName(subject: Subject): string {
    switch (subject) {
      case Subject.Math:
        // Use Pro for complex reasoning in Math
        return 'gemini-3-pro-preview';
      case Subject.History:
        // Flash is good, we will add grounding via tools
        return 'gemini-2.5-flash';
      case Subject.Science:
        return 'gemini-2.5-flash';
      case Subject.Literature:
        return 'gemini-3-pro-preview'; // Pro is better for nuanced writing feedback
      default:
        return 'gemini-2.5-flash';
    }
  }

  // Generate stream response for chat
  async *streamChat(
    subject: Subject,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    newMessage: string,
    imageData?: { data: string; mimeType: string }
  ) {
    const client = this.getClient();
    const modelName = this.getModelName(subject);
    const systemInstruction = SYSTEM_INSTRUCTIONS[subject];
    
    // Configure tools
    const tools = [];
    if (subject === Subject.History || subject === Subject.Science || subject === Subject.General) {
      tools.push({ googleSearch: {} });
    }

    const chat = client.chats.create({
      model: modelName,
      history: history,
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    // Prepare message content
    let content: any = newMessage;
    if (imageData) {
      content = {
        parts: [
          {
            inlineData: {
              data: imageData.data,
              mimeType: imageData.mimeType
            }
          },
          { text: newMessage }
        ]
      };
    }

    const result = await chat.sendMessageStream({ message: content });

    for await (const chunk of result) {
      yield chunk;
    }
  }

  // Generate Concept Map Data (JSON)
  async generateConceptMap(topic: string): Promise<ConceptGraphData> {
    const client = this.getClient();
    const model = 'gemini-2.5-flash';
    const prompt = `Generate a concept map for the topic: "${topic}". 
    Return strictly JSON with two arrays: "nodes" (id, group 1-3 based on importance, val 5-20) and "links" (source id, target id, value 1-5). 
    Create about 10-15 nodes effectively linking related sub-concepts.`;

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  group: { type: Type.INTEGER },
                  val: { type: Type.INTEGER },
                }
              }
            },
            links: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  value: { type: Type.INTEGER },
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned");
    return JSON.parse(text) as ConceptGraphData;
  }

  // Generate Image using Imagen
  async generateImage(prompt: string): Promise<string> {
    const client = this.getClient();
    const response = await client.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg',
      },
    });

    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64) throw new Error("Failed to generate image");
    return base64;
  }
}

export const geminiService = new GeminiService();