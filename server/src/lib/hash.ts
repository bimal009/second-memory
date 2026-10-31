import crypto from "crypto";
export const generateApiKey = (bytes: number = 32): string => {
    return crypto.randomBytes(bytes).toString("hex");
};
export const hashApiKey = (key: string): string => {
    return crypto.createHash("sha256").update(key).digest("hex");
};
