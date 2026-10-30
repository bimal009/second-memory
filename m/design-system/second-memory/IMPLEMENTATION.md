# Implementation notes

The current plan is [CAPTURE-PLAN.md](CAPTURE-PLAN.md). The project remains in m/.
The current interaction contract is [pages/camera.md](pages/camera.md).
Run instructions, stubbed seams, licenses and the manual test list are in [README](../../README.md).

The previous rolling-buffer / separate-session prototype is retired from the routed UI. CaptureProvider owns the simulated continuous chunk pipeline; AppPagerProvider owns navigation only. Existing bootstrap, onboarding, permissions and identity clients are preserved.

No commits or pushes were made for this revision.
