const Groq = require("groq-sdk");
const Home = require("../models/home");
const Booking = require("../models/booking");

// Lazy initialization — don't crash the app if GROQ_API_KEY is missing
let groq = null;
function getGroqClient() {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set. Please add it to your environment variables.");
    }
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}

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
        "Book a home for the user. Use when the user confirms they want to book a specific property. Can accept homeId or houseName, check-in and check-out dates, and number of guests.",
      parameters: {
        type: "object",
        properties: {
          homeId: {
            type: "string",
            description: "The MongoDB ObjectId of the home to book (preferred)",
          },
          homeName: {
            type: "string",
            description: "The name of the home to book if homeId is not known",
          },
          checkIn: {
            type: "string",
            description: "Optional check-in date or range (e.g. 'Dec 25')",
          },
          checkOut: {
            type: "string",
            description: "Optional check-out date (e.g. 'Dec 28')",
          },
          guests: {
            type: "number",
            description: "Number of guests",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getUserBookings",
      description:
        "View all existing bookings for the current logged-in user. Use when the user asks 'What are my bookings?', 'Show my booked trips', or similar.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manageFavourites",
      description:
        "Manage the user's favourite/saved homes. Can list saved favourites, add a home to favourites, or remove a home from favourites.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "add", "remove"],
            description: "Action to take: 'list' to see saved homes, 'add' to save a home, 'remove' to remove from saved",
          },
          homeId: {
            type: "string",
            description: "The MongoDB ObjectId of the home (required for add or remove)",
          },
          homeName: {
            type: "string",
            description: "The name of the home (optional helper if homeId is not known)",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancelBooking",
      description:
        "Cancel an existing confirmed booking. Under HavenTo platform policy, cancellations are only permitted up to 24 hours prior to check-in, and the user must provide a valid reason category and detailed explanation (minimum 15 characters).",
      parameters: {
        type: "object",
        properties: {
          bookingId: {
            type: "string",
            description: "The MongoDB ObjectId of the booking to cancel",
          },
          homeName: {
            type: "string",
            description: "The name of the booked home (if bookingId is not known)",
          },
          reason: {
            type: "string",
            enum: [
              "Change of travel plans",
              "Found alternative accommodation",
              "Medical or personal emergency",
              "Accidental / duplicate booking",
              "Host requested cancellation",
              "Other solid reason",
            ],
            description: "The category/reason for cancellation",
          },
          reasonDetails: {
            type: "string",
            description: "A solid, detailed explanation of why the user wants to cancel (minimum 15 characters)",
          },
        },
        required: ["reason", "reasonDetails"],
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
        // Search in both location and houseName fields
        query.$or = [
          { location: { $regex: args.location, $options: "i" } },
          { houseName: { $regex: args.location, $options: "i" } },
        ];
      }
      if (args.maxPrice) {
        query.price = { $lte: args.maxPrice };
      }
      if (args.minRating) {
        query.rating = { $gte: args.minRating };
      }

      const homes = await Home.find(query)
        .sort({ rating: -1 })
        .limit(10)
        .lean();

      if (homes.length === 0) {
        // Fallback: return all homes so the agent can help
        const allHomes = await Home.find().sort({ rating: -1 }).limit(5).lean();
        return {
          found: 0,
          message: `No homes found matching "${args.location || 'your criteria'}". Here are some popular options instead.`,
          suggestions: allHomes.map((h) => ({
            id: h._id.toString(),
            name: h.houseName,
            price: h.price,
            location: h.location,
            rating: h.rating,
          })),
        };
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
      let home = null;
      if (args.homeId) {
        try {
          home = await Home.findById(args.homeId).lean();
        } catch {
          // In case user passed a name instead of ObjectId
        }
      }
      if (!home && args.homeName) {
        home = await Home.findOne({ houseName: { $regex: args.homeName, $options: "i" } }).lean();
      }
      if (!home) {
        return { error: "Home not found." };
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

      let targetHome = null;
      if (args.homeId) {
        try {
          targetHome = await Home.findById(args.homeId);
        } catch {
          // not an ObjectId
        }
      }
      if (!targetHome && (args.homeName || args.homeId)) {
        const nameToSearch = args.homeName || args.homeId;
        targetHome = await Home.findOne({ houseName: { $regex: nameToSearch, $options: "i" } });
      }

      if (!targetHome) {
        return { error: "Could not find the property to book. Please specify the home name or ID." };
      }

      const booking = await Booking.create({
        user: userId,
        home: targetHome._id,
        status: "confirmed",
      });

      return {
        success: true,
        bookingId: booking._id.toString(),
        homeName: targetHome.houseName,
        location: targetHome.location,
        price: targetHome.price,
        dates: (args.checkIn && args.checkOut) ? `${args.checkIn} to ${args.checkOut}` : "Confirmed",
        guests: args.guests || 1,
        status: "confirmed",
        message: `Booking successfully confirmed for ${targetHome.houseName}!`,
      };
    }

    case "getUserBookings": {
      if (!userId) {
        return {
          error: "User must be logged in to view their bookings.",
          requiresLogin: true,
        };
      }

      const bookings = await Booking.find({ user: userId })
        .populate("home")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (!bookings || bookings.length === 0) {
        return { count: 0, message: "You don't have any bookings yet." };
      }

      return {
        count: bookings.length,
        bookings: bookings.map((b) => ({
          bookingId: b._id.toString(),
          status: b.status,
          bookedOn: b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "Recently",
          home: b.home
            ? {
                id: b.home._id.toString(),
                name: b.home.houseName,
                location: b.home.location,
                price: b.home.price,
              }
            : { name: "Property details unavailable" },
        })),
      };
    }

    case "cancelBooking": {
      if (!userId) {
        return {
          error: "User must be logged in to cancel a booking.",
          requiresLogin: true,
        };
      }

      const { bookingId, homeName, reason, reasonDetails } = args;

      if (!reason || !reasonDetails || reasonDetails.trim().length < 15) {
        return {
          error: "HavenTo Cancellation Policy requires a valid reason category and a detailed explanation of at least 15 characters to cancel any reservation.",
          policyNotice: "Cancellations are only allowed at least 24 hours prior to check-in with a solid written reason.",
        };
      }

      let booking;
      if (bookingId) {
        booking = await Booking.findOne({ _id: bookingId, user: userId }).populate("home");
      } else if (homeName) {
        const homes = await Home.find({
          houseName: { $regex: new RegExp(homeName, "i") },
        });
        const homeIds = homes.map((h) => h._id);
        booking = await Booking.findOne({
          home: { $in: homeIds },
          user: userId,
          status: "confirmed",
        }).populate("home");
      } else {
        // Find most recent confirmed booking
        booking = await Booking.findOne({ user: userId, status: "confirmed" })
          .sort({ createdAt: -1 })
          .populate("home");
      }

      if (!booking) {
        return {
          error: "No active confirmed booking found matching your request.",
        };
      }

      if (booking.status === "cancelled") {
        return { error: "This booking has already been cancelled." };
      }

      // Check 24 hour policy
      const now = new Date();
      if (booking.checkIn) {
        const checkInTime = new Date(booking.checkIn).getTime();
        const cutoffTime = checkInTime - 24 * 60 * 60 * 1000;
        if (now.getTime() > cutoffTime) {
          return {
            error: "Cancellation deadline has passed. Reservations cannot be cancelled within 24 hours of check-in.",
            policyNotice: "Non-refundable window has begun.",
          };
        }
      } else if (booking.createdAt) {
        const createdTime = new Date(booking.createdAt).getTime();
        if (now.getTime() > createdTime + 24 * 60 * 60 * 1000) {
          return {
            error: "Cancellation window closed. Bookings can only be cancelled within 24 hours of creation.",
          };
        }
      }

      booking.status = "cancelled";
      booking.cancellationReason = reason;
      booking.cancellationDetails = reasonDetails.trim();
      booking.cancelledAt = now;
      await booking.save();

      return {
        success: true,
        message: `Booking for ${booking.home?.houseName || "the home"} has been cancelled successfully. The reserved dates have been freed for other guests.`,
        homeName: booking.home?.houseName,
        cancellationReason: reason,
        cancelledAt: now.toISOString(),
      };
    }

    case "manageFavourites": {
      if (!userId) {
        return {
          error: "User must be logged in to manage favourites.",
          requiresLogin: true,
        };
      }

      const User = require("../models/user");
      const user = await User.findById(userId).populate("favourites");
      if (!user) return { error: "User record not found." };

      if (args.action === "list") {
        const favs = user.favourites || [];
        return {
          count: favs.length,
          favourites: favs.map((f) => ({
            id: f._id.toString(),
            name: f.houseName,
            location: f.location,
            price: f.price,
            rating: f.rating,
          })),
        };
      }

      // Action: add or remove
      let targetHome = null;
      if (args.homeId) {
        try { targetHome = await Home.findById(args.homeId); } catch {}
      }
      if (!targetHome && args.homeName) {
        targetHome = await Home.findOne({ houseName: { $regex: args.homeName, $options: "i" } });
      }
      if (!targetHome) {
        return { error: "Could not find the property to update favourites." };
      }

      const homeIdStr = targetHome._id.toString();

      if (args.action === "add") {
        if (!user.favourites.some((f) => f._id.toString() === homeIdStr)) {
          user.favourites.push(targetHome._id);
          await user.save();
        }
        return { success: true, message: `Added ${targetHome.houseName} to your favourites!` };
      }

      if (args.action === "remove") {
        user.favourites = user.favourites.filter((f) => f._id.toString() !== homeIdStr);
        await user.save();
        return { success: true, message: `Removed ${targetHome.houseName} from your favourites.` };
      }

      return { error: "Invalid action." };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Main Agent Function ─────────────────────────────────────────────────────
async function processMessage(userMessage, userId = null, chatHistory = []) {
  const systemPrompt = `You are HavenTo Assistant — an intelligent, friendly accommodation booking assistant for HavenTo.

IMPORTANT RULES:
1. Always use searchHomes when a user asks for stays, recommendations, places to stay, or mentions a location, budget, or rating. Never make up fake homes.
2. For specific properties, use getHomeDetails to fetch comprehensive details.
3. For auto-booking (e.g., "Book that one for Dec 25-28" or "Book Saurabh's home"):
   - Call createBooking with the homeId (or homeName) and dates.
   - If user is not logged in, explain politely that they need to be logged in to complete a booking.
4. If the user asks about their existing bookings or trips (e.g., "What are my bookings?"), call getUserBookings.
5. If the user asks about favourites (e.g., "Show my saved homes" or "Add to favourites"), call manageFavourites.
6. When showing homes, present them in a clean numbered list with:
   - Name
   - Location
   - Price (₹/night)
   - Rating
   - ID (so the user can easily say "Book #1" or "Tell me more about [ID]")
7. Keep responses concise, clean, and helpful. Do not use excessive emojis.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: userMessage },
  ];

  // First call — may trigger tool calls
  let response = await getGroqClient().chat.completions.create({
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
    response = await getGroqClient().chat.completions.create({
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
