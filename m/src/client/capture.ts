import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCapture,
  deleteCapture,
  endCapture,
  getCapture,
  listCaptures,
} from "@/api/capture";
import {
  deleteChunk,
  listChunks,
  uploadChunk,
  type UploadChunkInput,
} from "@/api/chunk";
import type { CreateCaptureSchema } from "@repo/types";

export function useCaptures() {
  return useQuery({
    queryKey: ["captures"],
    queryFn: listCaptures,
  });
}

export function useCapture(id: string | undefined) {
  return useQuery({
    queryKey: ["captures", id],
    queryFn: () => getCapture(id!),
    enabled: !!id,
  });
}

export function useCreateCapture() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCaptureSchema = { source: "phone" }) =>
      createCapture(data),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["captures"] });
    },
  });
}

export function useEndCapture() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => endCapture(id),
    onSuccess: (capture) => {
      void client.invalidateQueries({ queryKey: ["captures"] });
      void client.invalidateQueries({ queryKey: ["captures", capture.id] });
    },
  });
}

export function useDeleteCapture() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCapture(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["captures"] });
    },
  });
}

export function useChunks(captureId: string | undefined) {
  return useQuery({
    queryKey: ["captures", captureId, "chunks"],
    queryFn: () => listChunks(captureId!),
    enabled: !!captureId,
  });
}

export function useUploadChunk() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      captureId,
      input,
    }: {
      captureId: string;
      input: UploadChunkInput;
    }) => uploadChunk(captureId, input),
    onSuccess: (_chunk, { captureId }) => {
      void client.invalidateQueries({
        queryKey: ["captures", captureId, "chunks"],
      });
    },
  });
}

export function useDeleteChunk() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ captureId, idx }: { captureId: string; idx: number }) =>
      deleteChunk(captureId, idx),
    onSuccess: (_void, { captureId }) => {
      void client.invalidateQueries({
        queryKey: ["captures", captureId, "chunks"],
      });
    },
  });
}
