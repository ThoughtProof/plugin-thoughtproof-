import type {
  Action,
  Handler,
  Validator,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";

const THOUGHTPROOF_API_URL = "https://api.thoughtproof.ai/v1/check";

interface VerifyInput {
  claim: string;
  stakeLevel: "low" | "medium" | "high" | "critical";
  domain?: string;
}

interface ThoughtProofResponse {
  verdict: "ALLOW" | "HOLD";
  confidence: number;
  objections?: string[];
  summary?: string;
  requestId?: string;
}

/**
 * Extracts VerifyInput from the message or action options.
 * Falls back to parsing the last user message text.
 */
function extractInput(
  message: Memory,
  options?: Record<string, unknown>
): VerifyInput {
  // If structured options were passed directly (e.g. from another action)
  if (options && typeof options["claim"] === "string") {
    return {
      claim: options["claim"] as string,
      stakeLevel: (options["stakeLevel"] as VerifyInput["stakeLevel"]) ?? "medium",
      domain: options["domain"] as string | undefined,
    };
  }

  // Fall back: use the message text as the claim
  const text =
    typeof message.content === "string"
      ? message.content
      : (message.content as { text?: string })?.text ?? "";

  return {
    claim: text.trim() || "No claim provided",
    stakeLevel: "medium",
  };
}

/**
 * Calls the ThoughtProof API and returns a structured response.
 */
async function callThoughtProof(
  input: VerifyInput,
  apiKey?: string
): Promise<ThoughtProofResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(THOUGHTPROOF_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      claim: input.claim,
      stakeLevel: input.stakeLevel,
      ...(input.domain ? { domain: input.domain } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `ThoughtProof API error ${response.status}: ${errorText}`
    );
  }

  return (await response.json()) as ThoughtProofResponse;
}

/**
 * Formats the ThoughtProof API response into a human-readable string.
 */
function formatResult(input: VerifyInput, result: ThoughtProofResponse): string {
  const verdictEmoji = result.verdict === "ALLOW" ? "✅" : "🛑";
  const confidencePct = Math.round((result.confidence ?? 0) * 100);
  const objectionsList =
    result.objections && result.objections.length > 0
      ? "\n\n**Objections:**\n" +
        result.objections.map((o, i) => `${i + 1}. ${o}`).join("\n")
      : "";
  const summaryText = result.summary
    ? `\n\n**Summary:** ${result.summary}`
    : "";

  return (
    `${verdictEmoji} **ThoughtProof Verification**\n\n` +
    `**Claim:** ${input.claim}\n` +
    `**Stake Level:** ${input.stakeLevel.toUpperCase()}\n` +
    `**Verdict:** ${result.verdict}\n` +
    `**Confidence:** ${confidencePct}%` +
    summaryText +
    objectionsList
  );
}

// ---------------------------------------------------------------------------
// Action definition
// ---------------------------------------------------------------------------

const validate: Validator = async (
  _runtime: IAgentRuntime,
  _message: Memory,
  _state?: State
): Promise<boolean> => {
  // Always valid — the action can be triggered at any time
  return true;
};

const handler: Handler = async (
  runtime: IAgentRuntime,
  message: Memory,
  _state?: State,
  options?: Record<string, unknown>,
  callback?: HandlerCallback
): Promise<undefined> => {
  const input = extractInput(message, options);
  const apiKeySetting = runtime.getSetting("THOUGHTPROOF_API_KEY");
  const apiKey = typeof apiKeySetting === "string" ? apiKeySetting : undefined;

  let resultText: string;
  try {
    const result = await callThoughtProof(input, apiKey);
    resultText = formatResult(input, result);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    resultText =
      `⚠️ **ThoughtProof verification failed**\n\n` +
      `Could not reach the ThoughtProof API: ${errMsg}\n\n` +
      `Proceeding without verification. Exercise caution for high-stakes decisions.`;
  }

  if (callback) {
    await callback({ text: resultText }, "VERIFY_REASONING");
  }

  return undefined;
};

export const verifyReasoningAction: Action = {
  name: "VERIFY_REASONING",
  description:
    "Verify a claim or decision using adversarial multi-model reasoning before executing high-stakes actions.",
  similes: [
    "CHECK_REASONING",
    "VALIDATE_DECISION",
    "THOUGHTPROOF_CHECK",
    "ADVERSARIAL_VERIFY",
    "SANITY_CHECK",
  ],
  validate,
  handler,
  parameters: [
    {
      name: "claim",
      description: "The claim, decision, or statement to verify.",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "stakeLevel",
      description:
        "The stakes involved: low, medium, high, or critical. Higher stakes trigger more rigorous checks.",
      required: false,
      schema: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
      },
    },
    {
      name: "domain",
      description:
        "Optional domain context (e.g. 'medical', 'legal', 'financial') to guide the verification.",
      required: false,
      schema: { type: "string" },
    },
  ],
  examples: [
    [
      {
        name: "user",
        content: {
          text: "Before we proceed, verify: 'Approving this $50,000 wire transfer to account X is safe.'",
        },
      },
      {
        name: "agent",
        content: {
          text:
            "🛑 **ThoughtProof Verification**\n\n" +
            "**Claim:** Approving this $50,000 wire transfer to account X is safe.\n" +
            "**Stake Level:** CRITICAL\n" +
            "**Verdict:** HOLD\n" +
            "**Confidence:** 88%\n\n" +
            "**Objections:**\n" +
            "1. Insufficient identity verification for the recipient account.\n" +
            "2. No prior transaction history with this account.",
          action: "VERIFY_REASONING",
        },
      },
    ],
    [
      {
        name: "user",
        content: {
          text: "Check reasoning: 'It is safe to delete the staging database for cleanup.'",
        },
      },
      {
        name: "agent",
        content: {
          text:
            "✅ **ThoughtProof Verification**\n\n" +
            "**Claim:** It is safe to delete the staging database for cleanup.\n" +
            "**Stake Level:** HIGH\n" +
            "**Verdict:** ALLOW\n" +
            "**Confidence:** 76%\n\n" +
            "**Summary:** Staging databases are intended to be ephemeral. Confirm backups exist before proceeding.",
          action: "VERIFY_REASONING",
        },
      },
    ],
  ],
};
