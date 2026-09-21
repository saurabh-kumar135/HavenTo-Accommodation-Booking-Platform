const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Home = require("../models/home");
const {
  predictOptimalPrice,
  computeHostRevenueMetrics,
  getMarketIntelligence,
} = require("../services/pricingService");

// Helper to resolve host user from session or JWT
async function resolveHostUser(req) {
  if (req.session?.user?._id) return req.session.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(
        authHeader.split(" ")[1],
        process.env.JWT_SECRET || "havento_mobile_secret_key_2024"
      );
      const user = await User.findById(decoded.userId).select("-password");
      if (user) return user;
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * POST /api/analytics/pricing/predict
 * Generates an ML-calibrated dynamic pricing recommendation based on property characteristics.
 */
exports.postPredictPrice = async (req, res) => {
  try {
    const {
      location,
      category,
      guests,
      rating,
      amenities,
      month,
      is_weekend,
      isWeekend,
    } = req.body;

    const recommendation = predictOptimalPrice({
      location: location || "Goa",
      category: category || "Trending",
      guests: guests != null ? guests : 2,
      rating: rating != null ? rating : 4.5,
      amenities: amenities || [],
      month: month != null ? month : null,
      isWeekend: is_weekend != null ? is_weekend : isWeekend,
    });

    res.json({
      success: true,
      ...recommendation,
    });
  } catch (error) {
    console.error("Error predicting price:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate dynamic pricing",
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/pricing/home/:homeId
 * Compares an existing listing's current price against optimal dynamic pricing.
 */
exports.getHomePricingAnalysis = async (req, res) => {
  try {
    const { homeId } = req.params;

    const home = await Home.findById(homeId).lean();
    if (!home) {
      return res.status(404).json({
        success: false,
        message: "Property listing not found",
      });
    }

    const pricingRec = predictOptimalPrice({
      location: home.location,
      category: "Trending",
      guests: 2,
      rating: home.rating || 4.5,
      amenities: [],
    });

    const currentPrice = home.price || 0;
    const optimalPrice = pricingRec.recommended_price;
    const priceDiff = currentPrice - optimalPrice;
    const pctDiff = optimalPrice > 0 ? Math.round((priceDiff / optimalPrice) * 100 * 10) / 10 : 0;

    let stance = "Optimally Priced";
    let advice = "Your listing is well aligned with prevailing market conditions.";
    if (pctDiff > 15) {
      stance = "Premium Stance (Above Market)";
      advice = `Your price is ₹${priceDiff.toLocaleString()} (${pctDiff}%) above the market benchmark. Consider lowering slightly during off-peak dates to boost booking velocity.`;
    } else if (pctDiff < -15) {
      stance = "Underpriced (Opportunity for Uplift)";
      advice = `Your price is ₹${Math.abs(priceDiff).toLocaleString()} (${Math.abs(pctDiff)}%) below market value. You can increase rates by ₹${Math.round(Math.abs(priceDiff) * 0.7).toLocaleString()} without compromising occupancy.`;
    }

    res.json({
      success: true,
      home_id: homeId,
      house_name: home.houseName,
      location: home.location,
      current_price: currentPrice,
      recommended_price: optimalPrice,
      min_competitive_price: pricingRec.min_competitive_price,
      max_premium_price: pricingRec.max_premium_price,
      price_variance_percentage: pctDiff,
      market_stance: stance,
      recommendation_advice: advice,
      demand_tier: pricingRec.demand_tier,
      projected_occupancy_rate: pricingRec.projected_occupancy_rate,
      value_drivers: pricingRec.value_drivers,
    });
  } catch (error) {
    console.error("Error analyzing home pricing:", error);
    res.status(500).json({
      success: false,
      message: "Failed to evaluate home pricing analysis",
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/host/metrics
 * Returns host RevPAR, ADR, Occupancy, and dynamic pricing uplift.
 */
exports.getHostMetrics = async (req, res) => {
  try {
    const hostUser = await resolveHostUser(req);
    const hostId = hostUser ? hostUser._id.toString() : null;

    const metrics = await computeHostRevenueMetrics(hostId);

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error("Error calculating host metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate host revenue metrics",
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/market/overview
 * Macro travel market metrics and destinations overview.
 */
exports.getMarketOverview = async (req, res) => {
  try {
    const market = await getMarketIntelligence();
    res.json({
      success: true,
      market,
    });
  } catch (error) {
    console.error("Error getting market overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch market overview",
      error: error.message,
    });
  }
};
