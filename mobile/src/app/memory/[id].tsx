import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { MemoryDetail } from "@/features/memories/MemoryDetail";

/** Memory detail screen: large frame, transcript, location, delete. */
export default function MemoryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = Array.isArray(id) ? id[0] : id;

  if (!memoryId) {
    return null;
  }

  return (
    <MemoryDetail
      id={memoryId}
      onDelete={() => {
        void router.back();
      }}
    />
  );
}
