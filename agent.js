// agent.js
// HavenTo Autonomous AI Agent Client (Connected to live Kaggle Mistral GPU endpoint)
//
// Usage:
//   node agent.js                                    -> Runs default test query
//   node agent.js "Find me a home in Goa under 2000" -> Queries your custom question
//   node agent.js --chat                             -> Starts interactive terminal chat session

const readline = require("readline");

const KAGGLE_URL = process.env.KAGGLE_URL || "";
const KAGGLE_API_KEY = process.env.KAGGLE_API_KEY || "";

// 📝 Default question sent when you run "node agent.js" without any arguments:
const DEFAULT_USER_PROMPT = "Find me a stay in Taharpur under 500 and show me its details";

const SYSTEM_PROMPT = `You are HavenTo Assistant, an exclusive accommodation booking assistant for HavenTo.
You have access to tools that query our live MongoDB database.

STRICT INSTRUCTIONS:
1. For ANY inquiry about finding, recommending, or booking stays, you MUST call the appropriate tool (search_homes, get_home_details, create_booking).
2. Never invent, hallucinate, or fabricate stays, prices, or IDs. Only use real data from the database.
3. If asked questions unrelated to HavenTo accommodations or travel, politely decline.`;

const HAVENTO_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_homes",
      description: "Search homes in the MongoDB database filtered by location, max price, and min rating.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City, area name, or house name" },
          max_price: { type: "number", description: "Maximum price per night in INR" },
          min_rating: { type: "number", description: "Minimum rating from 1 to 5" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_home_details",
      description: "Get complete details, amenities, and host information for a specific home ID.",
      parameters: {
        type: "object",
        properties: {
          home_id: { type: "string", description: "The 24-character MongoDB ObjectId" }
        },
        required: ["home_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a new booking in MongoDB for a given home and date range.",
      parameters: {
        type: "object",
        properties: {
          home_id: { type: "string" },
          check_in: { type: "string", description: "YYYY-MM-DD" },
          check_out: { type: "string", description: "YYYY-MM-DD" },
          guests: { type: "integer" }
        },
        required: ["home_id", "check_in", "check_out"]
      }
    }
  }
];

async function sendQuery(messages) {
  const requestBody = {
    temperature: 0.2,
    messages: messages,
    tools: HAVENTO_TOOLS,
    tool_choice: "auto"
  };

  const startTime = Date.now();
  const res = await fetch(KAGGLE_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KAGGLE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const raw = await res.text();

  try {
    const data = JSON.parse(raw);
    return { data, duration, raw };
  } catch {
    return { data: null, duration, raw };
  }
}

function displayResponse(result) {
  const { data, duration, raw } = result;
  console.log("\n==================================================");
  console.log(`🏨 HAVENTO ASSISTANT (KAGGLE INFERENCE) [${duration}s]`);
  console.log("==================================================\n");

  if (data && data.content) {
    console.log(data.content);
    console.log("\n--------------------------------------------------");
    console.log(`Finish Reason: ${data.finish_reason || "stop"}`);
    console.log("--------------------------------------------------\n");
  } else if (data && data.detail) {
    console.error("⚠️ Kaggle Error:", data.detail);
    console.log("--------------------------------------------------\n");
  } else {
    console.log(raw);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Interactive chat mode
  if (args.includes("--chat") || args.includes("-i")) {
    console.log("==================================================");
    console.log("🏨 Welcome to HavenTo Live AI Chat (Mistral 7B)");
    console.log("Type your stay inquiry or 'exit' to quit.");
    console.log("==================================================\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const conversation = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    const ask = () => {
      rl.question("User > ", async (input) => {
        const trimmed = input.trim();
        if (!trimmed || trimmed.toLowerCase() === "exit") {
          rl.close();
          return;
        }

        conversation.push({ role: "user", content: trimmed });
        process.stdout.write("⏳ Thinking & checking MongoDB Atlas...\r");

        const result = await sendQuery(conversation);
        process.stdout.write("                                        \r");
        displayResponse(result);

        if (result.data && result.data.content) {
          conversation.push({ role: "assistant", content: result.data.content });
        }
        ask();
      });
    };
    ask();
    return;
  }

  // Single-query mode (custom query from CLI or default)
  const userQuery = args.join(" ").trim() || DEFAULT_USER_PROMPT;
  console.log(`\n🔍 Querying HavenTo: "${userQuery}"`);
  console.log("⏳ Sending request to Kaggle Mistral + MongoDB Atlas...");

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userQuery }
  ];

  const result = await sendQuery(messages);
  displayResponse(result);
}

main().catch((err) => console.error("Request failed:", err));
