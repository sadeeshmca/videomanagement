import { createStart } from "@tanstack/react-start";
import { attachAuth } from "@/lib/auth.client";

export const startInstance = createStart(() => ({
  functionMiddleware: [attachAuth],
}));
