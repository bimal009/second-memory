import { defineRelations } from "drizzle-orm";
import * as schema from "../schema";

export const relations = defineRelations(schema, (r) => ({
  users: {
    devices: r.many.devices(),
    captures: r.many.captures(),
    memories: r.many.memories(),
    objects: r.many.objects(),
    reminders: r.many.reminders(),
    dailyRecaps: r.many.dailyRecaps(),
    modelCalls: r.many.modelCalls(),
  },
  devices: {
    user: r.one.users({
      from: r.devices.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  captures: {
    user: r.one.users({
      from: r.captures.userId,
      to: r.users.id,
      optional: false,
    }),
    chunks: r.many.chunks(),
    memories: r.many.memories(),
    modelCalls: r.many.modelCalls(),
  },
  chunks: {
    capture: r.one.captures({
      from: r.chunks.captureId,
      to: r.captures.id,
      optional: false,
    }),
    memories: r.many.memories(),
  },
  memories: {
    user: r.one.users({
      from: r.memories.userId,
      to: r.users.id,
      optional: false,
    }),
    capture: r.one.captures({
      from: r.memories.captureId,
      to: r.captures.id,
      optional: false,
    }),
    chunk: r.one.chunks({
      from: r.memories.chunkId,
      to: r.chunks.id,
    }),
    media: r.many.media(),
    sightings: r.many.sightings(),
    reminders: r.many.reminders(),
  },
  objects: {
    user: r.one.users({
      from: r.objects.userId,
      to: r.users.id,
      optional: false,
    }),
    sightings: r.many.sightings(),
    media: r.many.media(),
  },
  media: {
    memory: r.one.memories({
      from: r.media.memoryId,
      to: r.memories.id,
      optional: false,
    }),
    parent: r.one.media({
      from: r.media.parentId,
      to: r.media.id,
      alias: "media_parent",
    }),
    children: r.many.media({
      from: r.media.id,
      to: r.media.parentId,
      alias: "media_parent",
    }),
    object: r.one.objects({
      from: r.media.objectId,
      to: r.objects.id,
    }),
    sightings: r.many.sightings(),
  },
  sightings: {
    object: r.one.objects({
      from: r.sightings.objectId,
      to: r.objects.id,
      optional: false,
    }),
    memory: r.one.memories({
      from: r.sightings.memoryId,
      to: r.memories.id,
      optional: false,
    }),
    frame: r.one.media({
      from: r.sightings.frameId,
      to: r.media.id,
    }),
  },
  reminders: {
    user: r.one.users({
      from: r.reminders.userId,
      to: r.users.id,
      optional: false,
    }),
    memory: r.one.memories({
      from: r.reminders.memoryId,
      to: r.memories.id,
    }),
  },
  dailyRecaps: {
    user: r.one.users({
      from: r.dailyRecaps.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  modelCalls: {
    user: r.one.users({
      from: r.modelCalls.userId,
      to: r.users.id,
    }),
    capture: r.one.captures({
      from: r.modelCalls.captureId,
      to: r.captures.id,
    }),
  },
}));
