import { mockClient } from "@/api/mockClient";
import type { SecondMemoryClient } from "@/api/domainClient";

/**
 * The active client. The FastAPI backend will ship an HTTP implementation
 * of `SecondMemoryClient` and this file becomes the only edit needed.
 */
export const api: SecondMemoryClient = mockClient;
