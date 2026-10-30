import { mkdir } from "node:fs/promises";

export const TMP_STORAGE_PATH = "tmp";

export const ensureDir = async (path: string) => {
  await mkdir(path, { recursive: true });
};

export const ensureTmpDir = () => ensureDir(TMP_STORAGE_PATH);

export const captureDir = (captureId: string) =>
  `${TMP_STORAGE_PATH}/captures/${captureId}`;
