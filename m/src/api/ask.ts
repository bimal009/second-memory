import { axiosInstance } from "@/axios";
import type { AskAnswer } from "@repo/types";

export async function askQuestion(question: string): Promise<AskAnswer> {
    const { data } = await axiosInstance.post<AskAnswer>("/ask", { question });
    if (!data)
        throw new Error("Ask returned no answer");
    return data;
}
