const Groq = require("groq-sdk");
const Home = require("../models/home");
const Booking = require("../models/booking");
const { predictOptimalPrice } = require("./pricingService");

// Lazy initialization — don't crash the app if GROQ_API_KEY is missing
let groq = null;
function getGroqClient() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is required.");
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

// ── Web Search Implementation (DuckDuckGo + Wikipedia Fallback) ─────────────
async function executeWebSearch(query, maxResults = 4) {
  if (!query || !query.trim()) {
    return { query, found: 0, results: [] };
  }

  const cleanQuery = query.trim();

  // 1. DuckDuckGo HTML search
  try {
    const encodedQuery = encodeURIComponent(cleanQuery);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    const res = await fetch(ddgUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      const results = [];
      const resultBlocks = html.split('<div class="result results_links');

      for (
        let i = 1;
        i < resultBlocks.length && results.length < maxResults;
        i++
      ) {
        const block = resultBlocks[i];
        const titleMatch = block.match(/<a class="result__a"[^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        const urlMatch = block.match(/href="([^"]+)"/);

        if (titleMatch && snippetMatch) {
          const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
          const snippet = snippetMatch[1].replace(/<[^>]+>/g, "").trim();
          let url = urlMatch ? urlMatch[1] : "";
          if (url.includes("uddg=")) {
            try {
              url = decodeURIComponent(url.split("uddg=")[1].split("&")[0]);
            } catch {}
          }
          if (title && snippet) {
            results.push({ title, snippet, url });
          }
        }
      }

      if (results.length > 0) {
        return { query: cleanQuery, found: results.length, results };
      }
    }
  } catch (e) {
    console.warn("DuckDuckGo search error, using fallback:", e.message);
  }

  // 2. Wikipedia Summary API fallback (extremely fast for destination/sights queries)
  try {
    const simplified = cleanQuery
      .replace(/best places to visit in|places to visit in|weather in|top sights in|how to reach/gi, "")
      .trim();
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(simplified)}`;
    const wikiRes = await fetch(wikiUrl, { signal: AbortSignal.timeout(3000) });
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData.extract) {
        return {
          query: cleanQuery,
          found: 1,
          results: [
            {
              title: wikiData.title || cleanQuery,
              snippet: wikiData.extract,
              url:
                wikiData.content_urls?.desktop?.page ||
                `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiData.title)}`,
            },
          ],
        };
      }
    }
  } catch {}

  return {
    query: cleanQuery,
    found: 0,
    message: "No live web results found. Answering based on verified travel knowledge.",
    results: [],
  };
}

// ── Tool Definitions ────────────────────────────────────────────────────────
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
            description: "City or area to search in (e.g. Mumbai, Goa, Delhi, Taharpur)",
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
          homeName: {
            type: "string",
            description: "The name of the home if ID is not known",
          },
        },
        required: [],
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
            description: "Optional check-in date or range (e.g. 'Dec 25' or 'YYYY-MM-DD')",
          },
          checkOut: {
            type: "string",
            description: "Optional check-out date (e.g. 'Dec 28' or 'YYYY-MM-DD')",
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
            description:
              "Action to take: 'list' to see saved homes, 'add' to save a home, 'remove' to remove from saved",
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
            description:
              "A solid, detailed explanation of why the user wants to cancel (minimum 15 characters)",
          },
        },
        required: ["reason", "reasonDetails"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "predictDynamicPricing",
      description:
        "Predict fair-market dynamic nightly price and demand drivers for any destination or property using our revenue intelligence model.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City or destination (e.g. Goa, Taharpur, Mumbai, Delhi)",
          },
          category: {
            type: "string",
            description:
              "Property category (e.g. Villa, Trending, Apartment, Cabin, Beachfront)",
          },
          guests: {
            type: "integer",
            description: "Number of guests (e.g. 2, 4, 6)",
          },
          amenities: {
            type: "array",
            items: { type: "string" },
            description:
              "List of amenities (e.g. Swimming Pool, Air Conditioning, Free Parking)",
          },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "webSearch",
      description:
        "Search the live web for real-time information, tourist attractions, destination sights, weather forecasts, transportation/routes, and local travel advisories.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The search query to look up on the web (e.g. 'top attractions in Goa', 'best time to visit Manali', 'how to reach Taharpur')",
          },
          maxResults: {
            type: "integer",
            description: "Maximum number of search results to return (default 4)",
          },
        },
        required: ["query"],
      },
    },
  },
];

// ── Pre-search Helper ───────────────────────────────────────────────────────
async function extractAndPresearchHomes(message) {
  const stopWords = new Set([
    "the", "and", "for", "with", "from", "that", "this", "what", "where", "have",
    "want", "need", "like", "just", "home", "stay", "give", "find", "show", "tell",
    "about", "location", "place", "please", "some", "here", "there", "looking", "available",
  ]);
  const words = message.split(/\s+/).map((w) => w.replace(/[?,.!:;'"]/g, "").trim());
  const terms = words.filter((w) => w.length >= 3 && !stopWords.has(w.toLowerCase()));

  if (terms.length === 0) return [];

  const orQueries = terms.map((t) => ({
    $or: [
      { location: { $regex: t, $options: "i" } },
      { houseName: { $regex: t, $options: "i" } },
    ],
  }));

  try {
    const matched = await Home.find({ $or: orQueries.flatMap((q) => q.$or) })
      .limit(3)
      .lean();
    return matched.map((h) => ({
      id: h._id.toString(),
      name: h.houseName,
      location: h.location,
      price: h.price,
      rating: h.rating,
      description: h.description || "",
    }));
  } catch {
    return [];
  }
}

// ── Tool Execution ──────────────────────────────────────────────────────────
async function executeTool(toolName, args, userId) {
  switch (toolName) {
    case "searchHomes": {
      const query = {};
      if (args.location) {
        const cleanLoc = args.location.replace(/[.,!?;:]+$/, "").trim();
        query.$or = [
          { location: { $regex: cleanLoc, $options: "i" } },
          { houseName: { $regex: cleanLoc, $options: "i" } },
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
        const allHomes = await Home.find().sort({ rating: -1 }).limit(5).lean();
        return {
          found: 0,
          message: `No homes found matching "${args.location || "your criteria"}". Here are some popular options instead.`,
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
        } catch {}
      }
      if (!home && args.homeName) {
        home = await Home.findOne({
          houseName: { $regex: args.homeName, $options: "i" },
        }).lean();
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
        } catch {}
      }

      const queryTerm = args.homeName || args.location || args.homeId;
      if (!targetHome && queryTerm) {
        targetHome = await Home.findOne({
          houseName: { $regex: queryTerm, $options: "i" },
        });

        if (!targetHome) {
          const locHomes = await Home.find({
            location: { $regex: queryTerm, $options: "i" },
          }).sort({ rating: -1 });
          if (locHomes.length === 1) {
            targetHome = locHomes[0];
          } else if (locHomes.length > 1) {
            return {
              status: "multiple_options",
              message: `I found ${locHomes.length} stays in ${queryTerm}. Which one would you like me to book?`,
              options: locHomes.map((h, i) => ({
                number: i + 1,
                id: h._id.toString(),
                name: h.houseName,
                price: `₹${h.price}/night`,
                rating: h.rating,
              })),
            };
          }
        }
      }

      if (!targetHome) {
        return {
          error:
            "Could not find the property to book. Please specify the home name or ID from the list.",
        };
      }

      let calculatedTotalPrice = targetHome.price;
      let checkInDate = undefined;
      let checkOutDate = undefined;

      if (args.checkIn && args.checkOut) {
        const parsedIn = new Date(args.checkIn);
        const parsedOut = new Date(args.checkOut);
        if (
          !isNaN(parsedIn.getTime()) &&
          !isNaN(parsedOut.getTime()) &&
          parsedOut > parsedIn
        ) {
          checkInDate = parsedIn;
          checkOutDate = parsedOut;
          const diffDays =
            Math.ceil((parsedOut - parsedIn) / (1000 * 60 * 60 * 24)) || 1;
          calculatedTotalPrice = diffDays * targetHome.price;
        }
      }

      const booking = await Booking.create({
        user: userId,
        home: targetHome._id,
        status: "confirmed",
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: Number(args.guests) || 1,
        totalPrice: calculatedTotalPrice,
      });

      const dateString =
        checkInDate && checkOutDate
          ? `${checkInDate.toLocaleDateString()} to ${checkOutDate.toLocaleDateString()}`
          : "Confirmed (dates flexible)";

      return {
        success: true,
        bookingId: booking._id.toString(),
        homeName: targetHome.houseName,
        location: targetHome.location,
        price: targetHome.price,
        totalPrice: calculatedTotalPrice,
        dates: dateString,
        guests: Number(args.guests) || 1,
        status: "confirmed",
        message: `Booking successfully confirmed for ${targetHome.houseName} in ${targetHome.location}!`,
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
          bookedOn: b.createdAt
            ? new Date(b.createdAt).toLocaleDateString()
            : "Recently",
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
          error:
            "HavenTo Cancellation Policy requires a valid reason category and a detailed explanation of at least 15 characters to cancel any reservation.",
          policyNotice:
            "Cancellations are only allowed at least 24 hours prior to check-in with a solid written reason.",
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

      const now = new Date();
      if (booking.checkIn) {
        const checkInTime = new Date(booking.checkIn).getTime();
        const cutoffTime = checkInTime - 24 * 60 * 60 * 1000;
        if (now.getTime() > cutoffTime) {
          return {
            error:
              "Cancellation deadline has passed. Reservations cannot be cancelled within 24 hours of check-in.",
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

      let targetHome = null;
      if (args.homeId) {
        try {
          targetHome = await Home.findById(args.homeId);
        } catch {}
      }
      if (!targetHome && args.homeName) {
        targetHome = await Home.findOne({
          houseName: { $regex: args.homeName, $options: "i" },
        });
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
        return {
          success: true,
          message: `Added ${targetHome.houseName} to your favourites!`,
        };
      }

      if (args.action === "remove") {
        user.favourites = user.favourites.filter(
          (f) => f._id.toString() !== homeIdStr
        );
        await user.save();
        return {
          success: true,
          message: `Removed ${targetHome.houseName} from your favourites.`,
        };
      }

      return { error: "Invalid action." };
    }

    case "predictDynamicPricing": {
      const loc = args.location || "Goa";
      const cat = args.category || "Trending";
      const gst = args.guests || 2;
      const amen = args.amenities || [];
      const prediction = predictOptimalPrice({
        location: loc,
        category: cat,
        guests: gst,
        amenities: amen,
      });
      return {
        destination: loc,
        category: cat,
        guests: gst,
        fairMarketRate: `₹${prediction.recommended_price.toLocaleString()}/night`,
        recommendedRange: `₹${prediction.min_competitive_price.toLocaleString()} - ₹${prediction.max_premium_price.toLocaleString()}`,
        demandTier: prediction.demand_tier,
        projectedOccupancy: `${prediction.projected_occupancy_rate}%`,
        keyDrivers: prediction.value_drivers.map((d) => `${d.factor} (${d.impact})`),
      };
    }

    case "webSearch": {
      return await executeWebSearch(args.query, args.maxResults || 4);
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Main Agent Processor ────────────────────────────────────────────────────
async function processMessage(userMessage, userId = null, chatHistory = []) {
  const systemPrompt = `You are HavenTo Assistant — an exclusive, professional accommodation booking and customer support assistant for the HavenTo platform.

STRICT DOMAIN GUARDRAIL & SCOPE RESTRICTION:
- You are SOLELY and EXCLUSIVELY an assistant for the HavenTo accommodation platform.
- You must ONLY answer questions directly relevant to:
  1. Finding, browsing, recommending, and booking homes/accommodations on HavenTo.
  2. HavenTo platform features: bookings, cancellations, check-in/check-out dates, pricing, guests, locations, and saved favourites.
  3. Travel inquiries, tourist sights/attractions, and destination guides relevant to choosing a destination or stay on HavenTo.
- STRICT REFUSAL POLICY FOR OFF-TOPIC QUESTIONS:
  - If a user asks about ANY topic completely unrelated to travel, destinations, or HavenTo stays (such as science, "What is the universe?", astronomy, politics, general history, coding, homework, general trivia, recipes, philosophy, sports, or personal advice):
  - You MUST IMMEDIATELY AND POLITELY DECLINE to answer.
  - Reply with: "I am HavenTo's virtual booking assistant, specialized exclusively in helping you find, book, and manage accommodations on our platform. I cannot answer questions outside of HavenTo stays and bookings. How can I help you with your travel or stay plans today?"
  - NEVER provide answers to off-topic questions under any circumstances.

OPERATIONAL RULES:
1. Always use searchHomes when a user asks for stays, recommendations, places to stay, or mentions a location, budget, or rating. Never make up fake homes.
2. For specific properties, use getHomeDetails to fetch comprehensive details.
3. FOR BOOKING REQUESTS (e.g., "Book the home in Taharpur", "Book Sunny House", "Book #1", "Book that stay"):
   - When the user explicitly wants to book or reserve a stay:
     a) If you already know the home (or only 1 home exists in that location), call createBooking immediately with the homeId/homeName, checkIn, checkOut, and guests.
     b) If you don't know which home they want, use searchHomes first to find it, or present options and ask them which one they want to book.
     c) If user is not logged in, explain politely that they need to be logged in to complete a booking.
4. FOR CANCELLATION & REMOVING BOOKED HOMES:
   - Cancellations require a valid reason category from: ["Change of travel plans", "Found alternative accommodation", "Medical or personal emergency", "Accidental / duplicate booking", "Host requested cancellation", "Other solid reason"] and a detailed written explanation of at least 15 characters.
   - When the user initially asks to cancel, politely ask for their reason category and 15+ character explanation before calling cancelBooking.
5. If user asks about their existing bookings ("What are my bookings?", "Show my booked stays"), call getUserBookings.
6. For favourites (e.g., "Show my saved homes", "Add to favourites"), call manageFavourites.
7. Use predictDynamicPricing when a user or host asks about market prices, expected rates, or fair pricing for a location or category.
8. Use webSearch whenever a user asks about real-time web information, tourist attractions, sights to see, places to visit, weather forecasts, or travel directions for a destination (such as Goa, Mumbai, Manali, Taharpur). Always call webSearch instead of declining.
9. When showing homes, present them in a clean numbered list with Name, Location, Price (₹/night), Rating, and ID.
10. STRICT TRUTHFULNESS: Never invent fake stays. Only describe real listings returned by tools.`;

  // Pre-search matching homes to assist prompt
  const presearched = await extractAndPresearchHomes(userMessage);
  let presearchContext = "";
  if (presearched.length > 0) {
    presearchContext =
      "\n🏡 DATABASE SEARCH RESULTS FOR THIS QUERY:\n" +
      presearched
        .map(
          (h) =>
            `- ${h.name} in ${h.location} at ₹${h.price}/night (Rating: ${h.rating}⭐, ID: ${h.id}). Description: ${h.description}`
        )
        .join("\n");
  }

  const effectiveSystemPrompt = `${systemPrompt}${presearchContext ? `\n\n${presearchContext}` : ""}`;

  // Filter out stale refusals from history so agent doesn't get locked into refusing
  const cleanedHistory = (chatHistory || [])
    .filter((m) => {
      const text = m.content || m.text || "";
      return !text.includes("virtual booking assistant, specialized exclusively");
    })
    .slice(-6);

  const messages = [
    { role: "system", content: effectiveSystemPrompt },
    ...cleanedHistory,
    { role: "user", content: userMessage },
  ];

  // Call Groq with tool choice
  let response = await getGroqClient().chat.completions.create({
    model: "qwen/qwen3.8-27b",
    messages,
    tools,
    tool_choice: "auto",
    max_tokens: 800,
  });

  let assistantMessage = response.choices[0].message;

  // Tool calling loop
  const maxIterations = 5;
  let iteration = 0;

  while (assistantMessage.tool_calls && iteration < maxIterations) {
    iteration++;
    messages.push(assistantMessage);

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

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }

    response = await getGroqClient().chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages,
      tools,
      tool_choice: "auto",
      max_tokens: 800,
    });

    assistantMessage = response.choices[0].message;
  }

  const reply =
    assistantMessage.content || "I couldn't generate a response. Please try again.";

  return {
    reply,
    usage: response.usage,
  };
}

module.exports = { processMessage };
