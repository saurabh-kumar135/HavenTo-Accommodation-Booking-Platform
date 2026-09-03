const Groq = require("groq-sdk");
const Home = require("../models/home");
const Booking = require("../models/booking");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Tool Definitions (what the AI agent can do) ─────────────────────────────
const tools = [
  {
    type: "function",
    function: {
      name: "searchHomes",
      description:
        "Search for available homes/accommodations. Use this when the user wants to find a place to stay.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City or area to search in (e.g. Mumbai, Goa, Delhi)",
          },
          maxPrice: {
            type: "number",
            description: "Maximum price per night in INR",
          },
          minRating: {
            type: "number",
            description: "Minimum rating (1-5)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getHomeDetails",
      description:
        "Get full details of a specific home by its ID. Use when the user asks for more info about a particular home.",
      parameters: {
        type: "object",
        properties: {
          homeId: {
            type: "string",
            description: "The MongoDB ObjectId of the home",
          },
        },
        required: ["homeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createBooking",
      description:
        "Book a home for the user. Use when the user confirms they want to book a specific property.",
      parameters: {
        type: "object",
        properties: {
          homeId: {
            type: "string",
            description: "The MongoDB ObjectId of the home to book",
          },
        },
        required: ["homeId"],
      },
    },
  },
];

// ── Tool Execution (actually queries MongoDB) ───────────────────────────────
async function executeTool(toolName, args, userId) {
  switch (toolName) {
    case "searchHomes": {
      const query = {};
      if (args.location) {
        query.location = { $regex: args.location, $options: "i" };
      }
      if (args.maxPrice) {
        query.price = { $lte: args.maxPrice };
      }
      if (args.minRating) {
        query.rating = { $gte: args.minRating };
      }

      const homes = await Home.find(query)
        .sort({ rating: -1 })
        .limit(5)
        .lean();

      if (homes.length === 0) {
        return { found: 0, message: "No homes found matching your criteria." };
      }

      return {
        found: homes.length,
        homes: homes.map((h) => ({
          id: h._id.toString(),
          name: h.houseName,
          price: h.price,
          location: h.location,
          rating: h.rating,
          description: h.description || "No description available",
        })),
      };
    }

    case "getHomeDetails": {
      const home = await Home.findById(args.homeId).lean();
      if (!home) {
        return { error: "Home not found" };
      }
      return {
        id: home._id.toString(),
        name: home.houseName,
        price: home.price,
        location: home.location,
        rating: home.rating,
        description: home.description || "No description available",
        photos: home.photos || [],
        hasPhotos: (home.photos || []).length > 0,
      };
    }

    case "createBooking": {
      if (!userId) {
        return {
          error: "User must be logged in to create a booking.",
          requiresLogin: true,
        };
      }

      const home = await Home.findById(args.homeId);
      if (!home) {
        return { error: "Home not found. Cannot create booking." };
      }

      const booking = await Booking.create({
        user: userId,
        home: args.homeId,
        status: "confirmed",
      });

      return {
        success: true,
        bookingId: booking._id.toString(),
        homeName: home.houseName,
        price: home.price,
        status: "confirmed",
        message: `Booking confirmed for ${home.houseName}!`,
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Main Agent Function ─────────────────────────────────────────────────────
async function processMessage(userMessage, userId = null, chatHistory = []) {
  const systemPrompt = `You are HavenTo AI — a friendly and helpful accommodation booking assistant.

Your capabilities:
- Search for homes/accommodations by location, price, and rating
- Show detailed information about specific properties
- Book properties for logged-in users

Guidelines:
- Be warm, helpful, and concise
- When showing homes, present them in a clear numbered list with name, price, location, and rating
- Always mention the home ID when listing results so the user can refer to specific ones
- If the user wants to book, confirm which property before booking
- If the user asks something unrelated to accommodation/travel, politely redirect
- Use emojis sparingly to keep things friendly 🏡
- Prices are in INR (₹)`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: userMessage },
  ];

  // First call — may trigger tool calls
  let response = await groq.chat.completions.create({
    model: "qwen/qwen3.8-27b",
    messages,
    tools,
    tool_choice: "auto",
    max_tokens: 1024,
  });

  let assistantMessage = response.choices[0].message;

  // Tool calling loop — keep going until the model stops calling tools
  const maxIterations = 5;
  let iteration = 0;

  while (assistantMessage.tool_calls && iteration < maxIterations) {
    iteration++;

    // Add assistant's tool call message to history
    messages.push(assistantMessage);

    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      let toolArgs;
      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch {
        toolArgs = {};
      }

      console.log(`🔧 Agent calling tool: ${toolName}(${JSON.stringify(toolArgs)})`);

      const toolResult = await executeTool(toolName, toolArgs, userId);

      // Add tool result to messages
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }

    // Call the model again with tool results
    response = await groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages,
      tools,
      tool_choice: "auto",
      max_tokens: 1024,
    });

    assistantMessage = response.choices[0].message;
  }

  return {
    reply: assistantMessage.content || "I couldn't generate a response. Please try again.",
    usage: response.usage,
  };
}

module.exports = { processMessage };
