import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
export const embed = async (text: string): Promise<number[]> => {
    extractorPromise ??= pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    const output = await (await extractorPromise)(text, {
        pooling: "mean",
        normalize: true,
    });
    return Array.from(output.data as Float32Array);
};
