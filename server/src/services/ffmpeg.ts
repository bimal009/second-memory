import { execFile } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { FRAME_EVERY_S, IMAGES_CAP, MediaInfoSchema, PHASH_MIN_DISTANCE, } from "@repo/types";
import phash from "sharp-phash";
import distance from "sharp-phash/distance";
import { ensureDir } from "../lib/storage";
const execFileAsync = promisify(execFile);
export const getMediaInfo = async (path: string) => {
    const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "error",
        "-protocol_whitelist",
        "file",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        `file:${path}`,
    ], { timeout: 30000 });
    const { format, streams } = JSON.parse(stdout);
    const video = streams.find((s: any) => s.codec_type === "video");
    const audio = streams.find((s: any) => s.codec_type === "audio");
    if (!video && !audio)
        throw new Error("no audio or video stream");
    const isImage = video && /image2|_pipe|webp/.test(format.format_name);
    return MediaInfoSchema.parse({
        kind: isImage ? "image" : video ? "video" : "audio",
        width: video?.width ?? 0,
        height: video?.height ?? 0,
        duration: isImage ? 0 : Number(format.duration) || 0,
        has_audio: !isImage && !!audio,
    });
};
export const extractFrame = async (path: string, outputPath: string) => {
    await execFileAsync("ffmpeg", [
        "-v",
        "error",
        "-y",
        "-ss",
        "0",
        "-i",
        path,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        outputPath,
    ], { timeout: 60000 });
    return outputPath;
};
export const extractFrames = async (path: string, outDir: string) => {
    await ensureDir(outDir);
    await execFileAsync("ffmpeg", [
        "-v",
        "error",
        "-y",
        "-i",
        path,
        "-vf",
        `fps=1/${FRAME_EVERY_S}`,
        "-q:v",
        "3",
        "-start_number",
        "1",
        join(outDir, "%d.jpg"),
    ], { timeout: 60000 });
    const files = await readdir(outDir);
    return files
        .filter((f) => f.endsWith(".jpg"))
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((f) => join(outDir, f));
};
export const dedupeFrames = async (framePaths: string[]): Promise<string[]> => {
    const kept: string[] = [];
    let prevHash: string | undefined;
    for (let i = 0; i < framePaths.length; i++) {
        const h = await phash(framePaths[i]);
        const isEdge = i === 0 || i === framePaths.length - 1;
        if (isEdge ||
            prevHash === undefined ||
            distance(h, prevHash) >= PHASH_MIN_DISTANCE) {
            kept.push(framePaths[i]);
            prevHash = h;
        }
    }
    return kept;
};
export const capFrames = (framePaths: string[], cap = IMAGES_CAP): string[] => {
    if (framePaths.length <= cap)
        return framePaths;
    const picked = new Set<number>();
    for (let i = 0; i < cap; i++) {
        picked.add(Math.round((i * (framePaths.length - 1)) / (cap - 1)));
    }
    return [...picked].sort((a, b) => a - b).map((i) => framePaths[i]);
};
export const keepFrames = async (framePaths: string[]): Promise<string[]> => {
    const kept = capFrames(await dedupeFrames(framePaths));
    const dropped = framePaths.filter((p) => !kept.includes(p));
    await Promise.all(dropped.map((p) => rm(p, { force: true })));
    return kept;
};
export const convertMono = async (path: string, outputPath: string) => {
    await execFileAsync("ffmpeg", [
        "-v",
        "error",
        "-y",
        "-i",
        path,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        outputPath,
    ], { timeout: 60000 });
    return outputPath;
};
