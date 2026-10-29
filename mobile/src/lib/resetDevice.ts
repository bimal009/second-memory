import { deleteAllMemories, deleteEverything } from "@/api";
import { clearKey } from "./secureKey";
import { queryClient, restartBootstrap } from "./queryClient";
import { resetLocalRecordings } from "@/features/recording/resetRegistry";

/** Clear the key only after deletion succeeds, then re-enter the setup flow. */
export async function deleteMemoriesAndReset(everything = false) {
  if (everything) await deleteEverything(); else await deleteAllMemories();
  await resetLocalRecordings();
  await clearKey();
  queryClient.removeQueries({ queryKey: ["demo"] });
  await restartBootstrap();
}
