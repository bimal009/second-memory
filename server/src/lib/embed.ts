import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Local 384-dim embeddings (all-MiniLM-L6-v2). The Meta Model API offers no
// embeddings endpoint, so this runs on-device-in-the-server with ONNX.
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

export const embed = async (text: string): Promise<number[]> => {
  extractorPromise ??= pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  const output = await (await extractorPromise)(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data as Float32Array);
};
