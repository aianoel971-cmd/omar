---
name: Clerk client SDK compatibility
description: Runtime compatibility note for Replit-managed Clerk in this workspace.
---

In this workspace, `@clerk/react@5.54.0` did not match the available `@clerk/shared` API: the 3.x line lacked a required UI-loader export, while 4.x changed the context and UI-loader contracts. Forcing either shared version produced startup or runtime failures. `@clerk/clerk-react@5.61.3` rendered correctly with the current Replit-managed Clerk setup.

**Why:** The UI-loader mismatch was not caught by TypeScript and only appeared when Vite optimized dependencies or the browser loaded the page.

**How to apply:** Before changing the Clerk React package, verify the resolved `@clerk/shared` versions and confirm the preview renders without runtime errors. Avoid shimming mismatched internal Clerk exports; re-evaluate this pairing after the SDK versions are updated.
