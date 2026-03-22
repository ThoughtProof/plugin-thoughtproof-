import type { Plugin } from "@elizaos/core";
import { verifyReasoningAction } from "./actions/verifyReasoning";

/**
 * ThoughtProof Plugin for elizaOS
 *
 * Provides pre-execution reasoning verification via the ThoughtProof API.
 * Before your agent takes a high-stakes action, call VERIFY_REASONING to get
 * an adversarial multi-model verdict (ALLOW / HOLD) with confidence score
 * and a list of objections.
 *
 * Configuration:
 *   THOUGHTPROOF_API_KEY - Optional. Set in your character's secrets or env
 *                          to authenticate against the ThoughtProof API.
 */
export const thoughtproofPlugin: Plugin = {
  name: "thoughtproof",
  description:
    "Pre-execution reasoning verification for elizaOS agents. " +
    "Wraps the ThoughtProof API to provide adversarial multi-model verdicts " +
    "before high-stakes agent actions.",
  actions: [verifyReasoningAction],
};

// Named export for individual components
export { verifyReasoningAction };

// Default export for convenience
export default thoughtproofPlugin;
