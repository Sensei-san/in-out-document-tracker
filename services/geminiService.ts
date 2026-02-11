
import { GoogleGenAI, Type } from "@google/genai";
import { AIConfig } from "../types";

const getBaseSchema = () => ({
  type: Type.OBJECT,
  properties: {
    letterDate: { 
        type: Type.STRING,
        description: "The date found on the letter in YYYY-MM-DD format. If no date is found, this should be an empty string."
    },
    senderName: { 
        type: Type.STRING,
        description: "The name of the individual or organization that sent the letter."
    },
    subject: { 
        type: Type.STRING,
        description: "The main subject, title, or a brief summary of the letter's content."
    },
    referenceNumber: { 
        type: Type.STRING,
        description: "Any file reference number, case number, or unique identifier mentioned in the document."
    },
    originatingDivision: { 
        type: Type.STRING,
        description: "The department, division, or office from which the letter originated."
    },
  },
  required: ["letterDate", "senderName", "subject", "referenceNumber", "originatingDivision"]
});

export const extractDocumentDetails = async (imageDataUrl: string, config?: AIConfig): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = imageDataUrl.split(',')[1];
  
  const contents: any[] = [];
  
  // Add training examples if they exist
  let trainingInstruction = "";
  if (config?.spatialExamples && config.spatialExamples.length > 0) {
      trainingInstruction = "I have provided visual training examples to help you understand the document structure. ";
      config.spatialExamples.forEach((example, idx) => {
          const regionsText = example.regions.map(r => 
              `${r.label} is at [${r.box.ymin}, ${r.box.xmin}, ${r.box.ymax}, ${r.box.xmax}]`
          ).join(", ");
          
          trainingInstruction += `Example ${idx + 1}: Based on the regions defined: ${regionsText}. `;
          
          // Note: In a production app, we would ideally send the example images as parts. 
          // For now, we rely on the textual description of the regions to guide the focus.
      });
  }

  const systemInstructions = config?.systemInstructions 
    ? `Contextual Rules: ${config.systemInstructions}. `
    : "";

  const mainImagePart = {
    inlineData: {
      data: base64Data,
      mimeType: 'image/jpeg',
    },
  };

  const finalSchema: any = getBaseSchema();
  if (config?.customFields && config.customFields.length > 0) {
      config.customFields.forEach(field => {
          finalSchema.properties[field.label] = {
              type: Type.STRING,
              description: field.description
          };
          finalSchema.required.push(field.label);
      });
  }

  const promptText = `Analyze the provided document image and extract the following details. If a specific piece of information cannot be found, return an empty string. 
  ${trainingInstruction}
  ${systemInstructions}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: { parts: [{ text: promptText }, mainImagePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: finalSchema,
      },
    });

    const jsonString = response.text?.trim();
    if (!jsonString) {
      throw new Error("Empty response from API");
    }

    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Error extracting document details:", error);
    throw new Error("Failed to extract details from the document. Please try again or enter manually.");
  }
};
