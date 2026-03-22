# @thoughtproof/plugin-thoughtproof

> Pre-execution reasoning verification for [elizaOS](https://elizaos.ai) agents.

Stop your agent before it does something irreversible. ThoughtProof runs adversarial multi-model reasoning against a claim or decision and returns a verdict: **ALLOW** ✅ or **HOLD** 🛑 — with confidence score and objections.

---

## Installation

```bash
npm install @thoughtproof/plugin-thoughtproof
```

Add `@elizaos/core` as a peer dependency (already required by elizaOS).

---

## Usage

### Register the plugin

```typescript
import { thoughtproofPlugin } from "@thoughtproof/plugin-thoughtproof";

const character = {
  name: "MyAgent",
  plugins: [thoughtproofPlugin],
  settings: {
    secrets: {
      THOUGHTPROOF_API_KEY: "your-api-key-here", // optional
    },
  },
};
```

### Trigger the action

The `VERIFY_REASONING` action is triggered automatically by the elizaOS runtime when the agent detects a claim or decision that should be verified. You can also call it explicitly:

```
Before proceeding, verify: "It is safe to approve this payment."
```

---

## Action: `VERIFY_REASONING`

**Description:** Verify a claim or decision using adversarial multi-model reasoning before executing high-stakes actions.

### Parameters

| Name         | Type                                     | Required | Description                              |
|--------------|------------------------------------------|----------|------------------------------------------|
| `claim`      | `string`                                 | ✅ Yes   | The claim, decision, or statement to verify |
| `stakeLevel` | `"low" \| "medium" \| "high" \| "critical"` | No | Severity of the stakes (default: `medium`) |
| `domain`     | `string`                                 | No       | Domain context (e.g. `"financial"`)     |

### Example response

```
🛑 ThoughtProof Verification

Claim: Approve $50,000 wire transfer to account X
Stake Level: CRITICAL
Verdict: HOLD
Confidence: 88%

Objections:
1. Insufficient identity verification for the recipient account.
2. No prior transaction history with this account.
```

---

## Configuration

| Setting                | Description                                |
|------------------------|--------------------------------------------|
| `THOUGHTPROOF_API_KEY` | API key for authentication (optional for public tier) |

Set via character `settings.secrets` or environment variable.

---

## API

The plugin calls:

```
POST https://api.thoughtproof.ai/v1/check
Content-Type: application/json
Authorization: Bearer <THOUGHTPROOF_API_KEY>  (if set)

{
  "claim": "...",
  "stakeLevel": "high",
  "domain": "financial"
}
```

Response shape:

```json
{
  "verdict": "ALLOW" | "HOLD",
  "confidence": 0.88,
  "objections": ["...", "..."],
  "summary": "...",
  "requestId": "..."
}
```

---

## License

MIT © [ThoughtProof](https://thoughtproof.ai)
