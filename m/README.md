# Second Memory mobile

Remaining screens: onboarding, permissions, and a Capture text placeholder.
Bootstrap, secure key storage, permission handling, theme and required UI components are retained.
Real HTTP calls remain in src/api; React Query clients remain in src/client. The HTTP run adapter and its local chunk database are also retained.
Mock data, recording UI, pager, Ask, Today, Memories, Settings and their unused files have been removed.

From this directory, use pnpm expo start when ready to run. Check types with pnpm exec tsc --noEmit and lint with pnpm lint.
