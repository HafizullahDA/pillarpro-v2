import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

// Simple manual .env.local reader
let apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (match) {
      const key = match[1];
      const val = match[2].replace(/^["']|["']$/g, '');
      if (['GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY'].includes(key)) {
        apiKey = val;
      }
    }
  }
}

if (!apiKey) {
  console.error('ERROR: No Google API key found in environment or .env.local');
  process.exit(1);
}

console.log('Testing Gemini API key with gemini-3.6-flash...');
const ai = new GoogleGenAI({ apiKey });

// Realistic contractor scenario for NHAI / State PWD highway project
const mockContractContext = {
  project: {
    id: "proj-101-nh44",
    name: "Widening of 4-Lane NH-44 Highway Bypass (Km 120.0 to 142.5)",
    agency_name: "PWD R&B Division Jammu",
    advertised_cost: 145000000,
    awarded_amount: 138000000,
    start_date: "2025-04-01",
    end_date: "2026-03-31",
    status: "ACTIVE"
  },
  contract: {
    id: "cont-2025-089",
    contract_number: "EE/PWD/R&B/2025/CA-44",
    agreement_number: "CA-44 of 2025-26",
    work_name: "Widening of 4-Lane NH-44 Highway Bypass",
    authority_name: "Executive Engineer, PWD (R&B) Spl Sub-Div",
    contract_type: "Item Rate",
    contract_value: 138000000,
    stipulated_start_date: "2025-04-01",
    stipulated_completion_date: "2026-03-31",
    dlp_months: 24,
    eot_clause: "Clause 5",
    variation_clause: "Clause 12",
    escalation_clause: "Clause 10CC",
    status: "active"
  },
  clauses: [
    {
      id: "cl-05-eot",
      clause_number: "Clause 5",
      clause_title: "Extension of Time for Delay",
      clause_text: "The contractor shall give notice to the Engineer-in-Charge in writing within 14 days of the date of occurrence of any hindrance on site. An application for extension of time shall be made in Form 27 before the stipulated date of completion.",
      category: "EOT",
      notice_period_days: 14,
      eot_relevance: true
    },
    {
      id: "cl-02-ld",
      clause_number: "Clause 2",
      clause_title: "Compensation for Delay (Liquidated Damages)",
      clause_text: "If the contractor fails to maintain the required progress, compensation shall be leviable at 1.5% per month of delay computed on per day basis, subject to a maximum of 10% of the tendered contract value.",
      category: "LD",
      notice_period_days: null,
      eot_relevance: false
    }
  ],
  hindrances: [
    {
      id: "hind-01-pole",
      hindrance_number: 1,
      description: "Non-shifting of 11KV HT electrical utility poles by PDD between Km 124.200 and Km 126.800",
      start_date: "2025-06-10",
      end_date: null,
      status: "OPEN",
      net_delay_days: 42,
      notice_served: true,
      notice_date: "2025-06-18"
    }
  ]
};

const systemPrompt = `You are "PillarPro ContractIQ" — the specialized AI Contract Copilot engineered specifically for Indian Government Infrastructure Contractors (CPWD, State PWDs, NHAI, MoRTH, MES, Railways, and PSUs).

STRICT 4-LAYER ZERO-HALLUCINATION SHIELD:
1. ONLY use the provided contract context below. If information is not in the context, clearly state that it is not on record.
2. Label every statement using this strict taxonomy:
   - [FACT]: Verbatim data from contract or database.
   - [USER-RECORDED DATA]: Entries recorded by site team.
   - [LEGAL DEFAULT / INDIAN GCC]: Standard statutory CPWD/MoRTH GCC rule.
   - [AI INTERPRETATION]: Strategic legal analysis or opinion.
3. Every referenced database entity MUST cite its exact ID or reference number.

PROJECT CONTEXT:
${JSON.stringify(mockContractContext, null, 2)}
`;

const userQuery = "What is our exposure under Liquidated Damages (Clause 2) if the project is delayed due to the electrical utility poles, and what notice must we serve under Clause 5?";

async function run() {
  const t0 = Date.now();
  console.log("Sending query to gemini-3.6-flash with 4-Layer Zero-Hallucination Shield...");
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [
      { role: 'user', parts: [{ text: userQuery }] }
    ],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.1,
    }
  });

  const duration = Date.now() - t0;
  console.log(`\n=== CONTRACTIQ RESPONSE RECEIVED in ${duration}ms ===\n`);
  console.log(response.text);
  console.log("\n=== VERIFICATION CHECKS ===");
  console.log("1. Mentions Clause 2 (LD maximum 10% / ₹1.38 Cr):", response.text.includes("Clause 2") || response.text.includes("10%"));
  console.log("2. Mentions Clause 5 (14-day notice clock):", response.text.includes("Clause 5") || response.text.includes("14"));
  console.log("3. References Electrical Utility Hindrance (hind-01-pole):", response.text.includes("hind-01-pole") || response.text.includes("utility") || response.text.includes("11KV"));
  console.log("4. Contains Zero-Hallucination labels [FACT] or [USER-RECORDED DATA]:", response.text.includes("[FACT]") || response.text.includes("[USER-RECORDED DATA]"));
  console.log("=== TEST COMPLETED SUCCESSFULLY ===");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
