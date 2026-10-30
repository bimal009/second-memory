import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDevice,
  deleteDevice,
  listDevices,
  updateDevice,
} from "@/api/device";
import type { CreateDeviceSchema, UpdateDeviceSchema } from "@repo/types";

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
  });
}

export function useCreateDevice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeviceSchema) => createDevice(data),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useUpdateDevice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateDeviceSchema;
    }) => updateDevice(id, data),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useDeleteDevice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDevice(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
