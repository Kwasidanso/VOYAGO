import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Stripe from "stripe";
import dotenv from "dotenv";
import { initializeApp as initAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, FieldValue as AdminFieldValue } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Log environment variables related to Firebase/Google for diagnostics
  console.log("Firebase/Google Env keys:", Object.keys(process.env).filter(k => k.startsWith("GOOGLE_") || k.includes("FIREBASE")));

  app.use(express.json());

  // Stripe Setup
  const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      // Lazy initialization and error handling as per guidelines
      return null;
    }
    return new Stripe(key);
  };

  // Gemini Setup
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Stripe Payment Intent
  app.post("/api/create-payment-intent", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount || 425000, // Default for Maldives Serenity ($4,250)
        currency: "usd",
        automatic_payment_methods: { enabled: true },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Digital Concierge (AI Chat)
  app.post("/api/chat", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is missing" });
    }

    try {
      const { message, history, profile } = req.body;
      
      let systemInstruction = "You are the Voyago Digital Concierge, an elite premium travel assistant. Help the user with curated travel advice, luxury destination information, and booking assistance.";
      
      if (profile) {
        systemInstruction += `\n\nYou are chatting with ${profile.displayName || 'a Voyago premium member'}. ` +
          `User Profile details:\n` +
          `- Email: ${profile.email}\n` +
          `- Loyalty Level: ${profile.explorerLevel || 'Gold'}\n` +
          `- Reward Points Balances: ${profile.availablePoints || 12400} points\n` +
          `- Loyalty Referral Code: ${profile.referralCode || 'VOYAGO-MEMBER'}\n\n` +
          `Make sure to greet them warmly, acknowledging their premium ${profile.explorerLevel || 'Gold'} status and their reward point balance where natural and relevant. ` +
          `Mention that they can earn 2,500 points for every friend who signs up using their referral code ${profile.referralCode || 'VOYAGO-MEMBER'} on their Profile, and keep their recommendations boutique and upscale.`;
      }

      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        history: history ? history : [],
        config: {
          systemInstruction: systemInstruction,
        }
      });

      const result = await chat.sendMessage({ message });
      res.json({ text: result.text });
    } catch (error: any) {
      console.error('Chat error:', error);
      const isQuotaError = error.message?.includes('429') || 
                           error.status === 'RESOURCE_EXHAUSTED' || 
                           error.status === 429 ||
                           error.message?.includes('quota');

      if (isQuotaError) {
        return res.json({ 
          text: "I'm currently experiencing a high volume of requests. While I can't provide a personalized AI response right now, I can tell you that our top destinations this season are the Maldives, Tokyo, and Paris. How can I help you find more about these?" 
        });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Personalized Recommendations
  app.post("/api/recommendations", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is missing" });
    }

    try {
      const { pastBookings, savedDestinations, hotelPreferences } = req.body;

      const prompt = `You are the Voyago Digital Concierge. Based on the user's past travel history, saved interests, and specific hotel preferences, suggest 3 highly personalized new destinations they would love.
      
      User's Past Bookings: ${JSON.stringify(pastBookings)}
      User's Saved Destinations: ${JSON.stringify(savedDestinations)}
      User's Hotel Preferences: ${JSON.stringify(hotelPreferences || {})}

      When recommending, prioritize destinations that align with their preferred amenities and hotel types.

      Return a JSON array of 3 objects with these exact fields:
      - title (string): Name of the destination
      - reason (string): Why this fits them
      - type (string): A category
      - imageSearchQuery (string): A query for an image
      
      Respond ONLY with the JSON array, no markdown formatting.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      
      const text = result.text;
      const jsonStr = text.replace(/```json|```/g, "").trim();
      res.json(JSON.parse(jsonStr));
    } catch (error: any) {
      console.error('Recommendation error:', error);
      const isQuotaError = error.message?.includes('429') || 
                           error.status === 'RESOURCE_EXHAUSTED' || 
                           error.status === 429 ||
                           error.message?.includes('quota');

      if (isQuotaError) {
        return res.json([
          {
            title: "Amalfi Coast, Italy",
            reason: "Since you love Mediterranean views and luxury stays, the dramatic cliffs of Amalfi are a quintessential next step.",
            type: "Luxury Escape",
            image: "https://images.unsplash.com/photo-1633321088355-d0f81134ca3b?auto=format&fit=crop&q=80&w=800"
          },
          {
            title: "Kyoto, Japan",
            reason: "Based on your interest in curated experiences, Kyoto's blend of ancient tradition and modern luxury offers unique discovery.",
            type: "Cultural Discovery",
            image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800"
          },
          {
            title: "Swiss Alps",
            reason: "Looking for something adventurous yet refined? The Swiss Alps provide world-class resorts with direct nature access.",
            type: "Adventure",
            image: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&q=80&w=800"
          }
        ]);
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  // Itinerary Generation
  app.post("/api/itinerary", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is missing" });
    }

    try {
      const { destination, startDate, endDate, preferences } = req.body;

      const prompt = `Create a detailed, day-by-day travel itinerary for a trip to ${destination} from ${startDate} to ${endDate}.
      Preferences: ${preferences}
      Return JSON: { 
        "tripTitle": "title", 
        "days": [{ 
          "day": 1, 
          "theme": "theme", 
          "activities": [{ 
            "time": "09:00 AM", 
            "title": "title", 
            "description": "desc",
            "cost": number
          }] 
        }] 
      }. 
      Provide a realistic, integer estimated cost in USD for each individual activity (e.g. 0 for free beaches/walks, 15-50 for standard sightseeing/museums, 60-150 for premium tours, dining or excursions).`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      res.json(JSON.parse(result.text));
    } catch (error: any) {
      console.error('Itinerary error:', error);
      const isQuotaError = error.message?.includes('429') || 
                           error.status === 'RESOURCE_EXHAUSTED' || 
                           error.status === 429 ||
                           error.message?.includes('quota');

      if (isQuotaError) {
        return res.json({
          tripTitle: `Exploration of ${req.body.destination || 'your destination'}`,
          days: [
            {
              day: 1,
              theme: "Welcome & Discovery",
              activities: [
                { time: "10:00 AM", title: "Arrival & Hotel Check-in", description: "Arrive at your premium accommodation and settle in.", cost: 0 },
                { time: "01:00 PM", title: "Local Gourmet Lunch", description: "Enjoy fresh local cuisine at a top-rated nearby bistro.", cost: 45 },
                { time: "04:00 PM", title: "Orientation Walk", description: "Take a gentle stroll to familiarize yourself with the main highlights.", cost: 15 }
              ]
            }
          ]
        });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Budget Estimator Generation
  app.post("/api/budget", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is missing" });
    }

    try {
      const { destination, startDate, endDate, activities, travelers, flightClass } = req.body;

      const prompt = `You are the Voyago Luxury Budget Estimation Engine. 
Create a detailed, highly accurate travel budget estimation for a trip with these details:
- Destination: ${destination}
- Start Date: ${startDate}
- End Date: ${endDate}
- Activities & Preferences: ${JSON.stringify(activities || [])}
- Number of Travelers: ${travelers || 1}
- Flight Cabin Preference: ${flightClass || 'Economy'}

Calculate realistic market pricing estimates (in USD) customized for this destination and style of travel. Provide a breakdown including:
- baseFlightCost: Estimated roundtrip flight cost per person
- totalFlights: Scaled for ${travelers || 1} travelers
- hotelNightlyRate: Estimated nightly hotel rate for a suitable room
- totalHotels: Scaled for the number of nights and suitable rooms
- diningCostPerDay: Estimated dining/food cost per traveler per day
- totalDining: Scaled for all travelers and days
- activityCost: Scaled total activity/tour cost for all travelers and preferences
- localTransport: Scaled total local transport (private chauffeur, taxi, or public rail/rental) for all travelers and days
- premiumSurcharge: Any local luxury surcharges or regional fees
- emergencyBuffer: Generous fallback padding amount in USD
- totalEstimatedCost: The grand total of all sums.

Also provide:
- confidenceScore (number from 0 to 100): confidence in this market budget estimation
- seasonalAdvice (string): advice on when to book or seasonal price traps for this destination and these dates
- budgetTips (array of strings): 3-4 highly tailored insider money-saving tips or premium value hacks for this specific destination under these preferences
- localCurrencyCode (string): the ISO-4217 currency code of the local destination (e.g. "EUR", "JPY", "MVR", "GBP", "MXN", "AUD", "CHF", etc.)
- localCurrencySymbol (string): the currency symbol of the destination (e.g. "€", "¥", "Rf", "£", "$", etc.)
- localCurrencyName (string): the currency name (e.g. "Euro", "Maldivian Rufiyaa", "Japanese Yen", etc.)
- approxExchangeRate (number): estimated standard exchange rate in terms of how many units of this local currency are equivalent to exactly 1.00 USD (e.g., 1 USD = 0.92 EUR, so 0.92, or 1 USD = 153.2 JPY, so 153.2)
- currencyContextAdvice (string): a brief 1-2 sentence tip about using money at the destination (e.g., card acceptance, tipping customs, or ATM safety).

Return a JSON object in this exact format:
{
  "baseFlightCost": number,
  "totalFlights": number,
  "hotelNightlyRate": number,
  "totalHotels": number,
  "diningCostPerDay": number,
  "totalDining": number,
  "activityCost": number,
  "localTransport": number,
  "premiumSurcharge": number,
  "emergencyBuffer": number,
  "totalEstimatedCost": number,
  "confidenceScore": number,
  "seasonalAdvice": "string",
  "budgetTips": ["string"],
  "localCurrencyCode": "string",
  "localCurrencySymbol": "string",
  "localCurrencyName": "string",
  "approxExchangeRate": number,
  "currencyContextAdvice": "string"
}
Respond ONLY with this JSON object, with no markdown tags or wrapper format.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const text = result.text;
      const jsonStr = text.replace(/```json|```/g, "").trim();
      res.json(JSON.parse(jsonStr));
    } catch (error: any) {
      console.error('Budget estimation error:', error);
      const isQuotaError = error.message?.includes('429') || 
                           error.status === 'RESOURCE_EXHAUSTED' || 
                           error.status === 429 ||
                           error.message?.includes('quota');

      // Fallback calculation in case of Quota Error or general error
      const dest = req.body.destination || "Destination";
      const travs = Number(req.body.travelers) || 1;
      const fClass = req.body.flightClass || "Economy";
      
      const sDate = new Date(req.body.startDate || "2026-06-01");
      const eDate = new Date(req.body.endDate || "2026-06-08");
      const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
      const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // Heuristic calculations
      let baseFlight = 450;
      if (fClass === 'Business') baseFlight = 1600;
      if (fClass === 'First') baseFlight = 4200;
      
      let baseHotel = 150;
      if ((req.body.activities || []).includes('Luxury')) baseHotel = 550;

      let baseDining = 60;
      if ((req.body.activities || []).includes('Fine Dining') || (req.body.activities || []).includes('Luxury')) baseDining = 150;

      const totalFlights = baseFlight * travs;
      const totalHotels = baseHotel * nights;
      const totalDining = baseDining * travs * (nights + 1);
      const activityCost = 300 * travs;
      const localTransport = 120 * (nights + 1);
      const premiumSurcharge = (req.body.activities || []).includes('Luxury') ? 500 : 0;
      const emergencyBuffer = 250;
      const totalEstimatedCost = totalFlights + totalHotels + totalDining + activityCost + localTransport + premiumSurcharge + emergencyBuffer;

      // Detect currency and rate from destination heuristic
      const destLower = dest.toLowerCase();
      let localCurrencyCode = "USD";
      let localCurrencySymbol = "$";
      let localCurrencyName = "US Dollar";
      let approxExchangeRate = 1.0;
      let currencyContextAdvice = "The local currency is the US Dollar. Credit cards are universally accepted, though keeping small bills is useful for tipping.";

      if (destLower.includes("maldiv") || destLower.includes("male")) {
        localCurrencyCode = "MVR";
        localCurrencySymbol = "Rf";
        localCurrencyName = "Maldivian Rufiyaa";
        approxExchangeRate = 15.42;
        currencyContextAdvice = "Resorts accept major credit cards and USD. You only need Rufiyaa cash if visiting inhabited local islands.";
      } else if (destLower.includes("japan") || destLower.includes("tokyo") || destLower.includes("kyoto") || destLower.includes("osaka")) {
        localCurrencyCode = "JPY";
        localCurrencySymbol = "¥";
        localCurrencyName = "Japanese Yen";
        approxExchangeRate = 156.40;
        currencyContextAdvice = "Japan is traditionally cash-heavy, although major cards are accepted in cities. Carry some physical JPY for small food stalls.";
      } else if (destLower.includes("france") || destLower.includes("germany") || destLower.includes("italy") || destLower.includes("spain") || destLower.includes("paris") || destLower.includes("rome") || destLower.includes("europe") || destLower.includes("greece")) {
        localCurrencyCode = "EUR";
        localCurrencySymbol = "€";
        localCurrencyName = "Euro";
        approxExchangeRate = 0.92;
        currencyContextAdvice = "Euro is accepted everywhere. Master/Visa credit cards are standard, but carry some coins for public restrooms or small cafes.";
      } else if (destLower.includes("london") || destLower.includes("uk") || destLower.includes("england") || destLower.includes("britain") || destLower.includes("united kingdom")) {
        localCurrencyCode = "GBP";
        localCurrencySymbol = "£";
        localCurrencyName = "British Pound";
        approxExchangeRate = 0.79;
        currencyContextAdvice = "The UK is almost entirely cashless. Tap-to-pay via mobile or credit cards is expected on transport and in restaurants.";
      } else if (destLower.includes("canada") || destLower.includes("vancouver") || destLower.includes("toronto") || destLower.includes("montreal")) {
        localCurrencyCode = "CAD";
        localCurrencySymbol = "C$";
        localCurrencyName = "Canadian Dollar";
        approxExchangeRate = 1.37;
        currencyContextAdvice = "Canadian dollars are standard. Credit cards are accepted virtually everywhere. Tipping 15-20% is expected.";
      } else if (destLower.includes("australia") || destLower.includes("sydney") || destLower.includes("melbourne") || destLower.includes("queensland")) {
        localCurrencyCode = "AUD";
        localCurrencySymbol = "A$";
        localCurrencyName = "Australian Dollar";
        approxExchangeRate = 1.51;
        currencyContextAdvice = "Australian Dollar is used. Digital payment is nearly universal, and card tipping is optional but appreciated.";
      } else if (destLower.includes("swiss") || destLower.includes("switzerland") || destLower.includes("zurich") || destLower.includes("geneva")) {
        localCurrencyCode = "CHF";
        localCurrencySymbol = "CHF";
        localCurrencyName = "Swiss Franc";
        approxExchangeRate = 0.89;
        currencyContextAdvice = "Swiss Franc is the local currency. Credit cards are standard, but coins are useful for luggage carts or rural farm stalls.";
      }

      res.json({
        baseFlightCost: baseFlight,
        totalFlights,
        hotelNightlyRate: baseHotel,
        totalHotels,
        diningCostPerDay: baseDining,
        totalDining,
        activityCost,
        localTransport,
        premiumSurcharge,
        emergencyBuffer,
        totalEstimatedCost,
        confidenceScore: 78,
        seasonalAdvice: `High demand usually peaks for ${dest} during standard vacation periods. Consider booking at least 6 weeks in advance to lock in lower fares.`,
        budgetTips: [
          `Consider traveling on mid-week flights (Tuesdays/Wednesdays) to lower roundtrip flight fares.`,
          `Look for hotels that offer complimentary airport shuttles and hot breakfast inclusions to offset local transit and dining costs.`,
          `Book popular tours and attraction admissions online to avail bundle discounts and bypass queues.`
        ],
        isFallback: true,
        localCurrencyCode,
        localCurrencySymbol,
        localCurrencyName,
        approxExchangeRate,
        currencyContextAdvice
      });
    }
  });

  // Cruise Search/Recommendations
  app.post("/api/cruise-search", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is missing" });
    }

    try {
      const { destination, departurePort, duration } = req.body;

      const prompt = `Generate 3 luxury cruise options for ${destination}. Return JSON array.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      res.json(JSON.parse(result.text));
    } catch (error: any) {
      console.error('Cruise search error:', error);
      const isQuotaError = error.message?.includes('429') || 
                           error.status === 'RESOURCE_EXHAUSTED' || 
                           error.status === 429 ||
                           error.message?.includes('quota');

      if (isQuotaError) {
        return res.json([
          {
            id: "fallback-1",
            name: "Mediterranean Grandeur",
            line: "Silversea Cruises",
            destination: "Western Mediterranean",
            port: "Barcelona",
            duration: "7 Nights",
            price: 4200,
            rating: 4.9,
            image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&q=80&w=800",
            amenities: ["Butler Service", "Gourmet Dining"],
            description: "An ultra-luxury experience through Europe's most iconic ports."
          }
        ]);
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Similarity Search
  app.post("/api/search-similar", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is missing" });
    }

    try {
      const { type, destination, origin } = req.body;
      const prompt = `Recommend 3 similar alternatives to ${type} in ${destination}. Return JSON: { "recommendations": [...] }`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      res.json({ recommendations: JSON.parse(result.text) });
    } catch (error: any) {
      console.error("Gemini Search error:", error);
      const isQuotaError = error.message?.includes('429') || 
                           error.status === 'RESOURCE_EXHAUSTED' || 
                           error.status === 429 ||
                           error.message?.includes('quota');

      if (isQuotaError) {
        return res.json({ 
          recommendations: [
            { title: "Santorini, Greece", reason: "Similar romantic atmosphere and stunning views.", type: "Hotel", priceRange: "$$$$" },
            { title: "Bali, Indonesia", reason: "Excellent alternative for tropical luxury.", type: "Hotel", priceRange: "$$$" }
          ] 
        });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Spatial & Semantic AI Route Optimizer (TSP + Curated travel paths)
  app.post("/api/route-optimize", async (req, res) => {
    try {
      const { pois } = req.body;
      if (!pois || !Array.isArray(pois) || pois.length === 0) {
        return res.json({
          optimizedIndices: [],
          aiExplanation: "Add pins or attractions first to map out your custom route flow.",
          totalDistanceBefore: 0,
          totalDistanceAfter: 0
        });
      }

      const getDistance = (p1: any, p2: any) => {
        const lat1 = p1.lat;
        const lon1 = p1.lng;
        const lat2 = p2.lat;
        const lon2 = p2.lng;
        const R = 6371; // Earth's Radius (km)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      // Math optimization: Nearest Neighbor starting from index 0
      const computeTSP = (nodes: any[]): number[] => {
        if (nodes.length <= 1) return nodes.map((_, i) => i);
        const unvisited = new Set<number>(nodes.map((_, i) => i));
        const path: number[] = [];
        
        let current = 0;
        path.push(current);
        unvisited.delete(current);

        while (unvisited.size > 0) {
          let nextNode = -1;
          let minDist = Infinity;
          for (const idx of unvisited) {
            const dist = getDistance(nodes[current], nodes[idx]);
            if (dist < minDist) {
              minDist = dist;
              nextNode = idx;
            }
          }
          if (nextNode !== -1) {
            path.push(nextNode);
            unvisited.delete(nextNode);
            current = nextNode;
          } else {
            break;
          }
        }
        return path;
      };

      // Compute total trip distance before and after
      let distanceBefore = 0;
      for (let i = 0; i < pois.length - 1; i++) {
        distanceBefore += getDistance(pois[i], pois[i+1]);
      }

      const mathIndices = computeTSP(pois);
      let distanceAfter = 0;
      for (let i = 0; i < mathIndices.length - 1; i++) {
        distanceAfter += getDistance(pois[mathIndices[i]], pois[mathIndices[i+1]]);
      }

      // Format clean feedback response in case of API Key absence or rate limit fallback
      const makeFallbackResponse = (msgDetail = "using geographical nearest-neighbor algorithm") => {
        const fallbackText = `### 📍 Spatial Travel Sequence Optimized\n\n` +
          `We have successfully re-indexed your current travel path ${msgDetail} to eliminate backtracking and shorten transit times.\n\n` +
          `* **Route Flow:** ${mathIndices.map((idx, i) => `**${i + 1}.** ${pois[idx].name}`).join(" &rarr; ")}\n\n` +
          `* **Transit Metrics:** Total distance reduced from **${distanceBefore.toFixed(1)} km** to **${distanceAfter.toFixed(1)} km** ` +
          `(saving **${Math.max(0, distanceBefore - distanceAfter).toFixed(1)} km** of unnecessary commuting!).`;
        
        return {
          optimizedIndices: mathIndices,
          aiExplanation: fallbackText,
          totalDistanceBefore: distanceBefore,
          totalDistanceAfter: distanceAfter
        };
      };

      if (!ai) {
        return res.json(makeFallbackResponse("Offline Spatial Math engine"));
      }

      // Request Gemini to analyze, validate ordering and generate a high-end Travel Concierge curation
      const prompt = `You are the Voyago Elite AI Route Optimization Advisor.
Analyze this list of Points of Interest (POIs) that a premium traveler wants to visit. The stay/starting point is usually the first item.

POIs Details:
${JSON.stringify(pois.map((p, idx) => ({ index: idx, name: p.name, category: p.category, lat: p.lat, lng: p.lng, description: p.description })))}

Our backend spatial engine suggests this candidate index path to minimize transit loops: [${mathIndices.join(', ')}].

Analyze the layout and categories. Construct a professional, luxury-level travel path curation in clean Markdown justifying the sequence, and return both the sequence and explanation as JSON.
Format advice on:
1. Why this route is highly efficient (e.g., proximity clustering, logical flow).
2. Curated travel timing recommendations (e.g. which to visit at dusk/morning and proximity of meal options).

Return a JSON object in this exact format:
{
  "optimizedIndices": [number], // Must be exactly a permutation of original indices (0 to ${pois.length - 1}). Re-validate the candidate path [${mathIndices.join(', ')}] or amend slightly if there's a compelling logical flow.
  "aiExplanation": "Markdown string describing details beautifully and concisely"
}
Respond ONLY with this JSON object.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = result.text;
      const cleanJsonStr = responseText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJsonStr);

      const finalIndices = Array.isArray(parsed.optimizedIndices) && parsed.optimizedIndices.length === pois.length
        ? parsed.optimizedIndices
        : mathIndices;

      // Calculate the final distance after AI/User final sequencing check
      let finalDistanceAfter = 0;
      for (let i = 0; i < finalIndices.length - 1; i++) {
        finalDistanceAfter += getDistance(pois[finalIndices[i]], pois[finalIndices[i+1]]);
      }

      res.json({
        optimizedIndices: finalIndices,
        aiExplanation: parsed.aiExplanation || "Travel itinerary organized successfully.",
        totalDistanceBefore: distanceBefore,
        totalDistanceAfter: finalDistanceAfter
      });

    } catch (error: any) {
      console.warn("AI optimization fallback executed due to:", error);
      // Fallback cleanly
      try {
        const getDistance = (p1: any, p2: any) => {
          const lat1 = p1.lat;
          const lon1 = p1.lng;
          const lat2 = p2.lat;
          const lon2 = p2.lng;
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };
        const pois = req.body.pois || [];
        let beforeDist = 0;
        for (let i = 0; i < pois.length - 1; i++) {
          beforeDist += getDistance(pois[i], pois[i+1]);
        }
        const mathIndices = pois.map((_: any, i: number) => i);
        if (pois.length > 1) {
          const unvisited = new Set<number>(pois.map((_: any, i: number) => i));
          const path: number[] = [];
          
          let current = 0;
          path.push(current);
          unvisited.delete(current);

          while (unvisited.size > 0) {
            let nextNode = -1;
            let minDist = Infinity;
            for (const idx of unvisited) {
              const dist = getDistance(pois[current], pois[idx]);
              if (dist < minDist) {
                minDist = dist;
                nextNode = idx;
              }
            }
            if (nextNode !== -1) {
              path.push(nextNode);
              unvisited.delete(nextNode);
              current = nextNode;
            } else {
              break;
            }
          }
          let afterDist = 0;
          for (let i = 0; i < path.length - 1; i++) {
            afterDist += getDistance(pois[path[i]], pois[path[i+1]]);
          }
          const cleanIntro = `### 🗺️ AI Optimization Engine (Fallback Mode Available)\n\n` +
            `We have structured your sequence using our high-precision geodesic path algorithm. Let's look at the optimized order:\n\n` +
            `* **Route Path:** ${path.map((idx) => `**${pois[idx]?.name}**`).join(" &rarr; ")}\n\n` +
            `* **Efficiency Gain:** Total transit distance reduced from **${beforeDist.toFixed(1)} km** to **${afterDist.toFixed(1)} km** (saving **${Math.max(0, beforeDist - afterDist).toFixed(1)} km** travel time).`;
          
          return res.json({
            optimizedIndices: path,
            aiExplanation: cleanIntro,
            totalDistanceBefore: beforeDist,
            totalDistanceAfter: afterDist
          });
        }
      } catch (errInner) {
        // Safe empty exit
      }
      res.status(500).json({ error: "Failed to optimize travel route." });
    }
  });

  // --- START RECURRING PRICING & FLIGHT TRIGGER PIPELINE ---
  let dbAdmin: any = null;

  function getAdminDb() {
    if (dbAdmin) return dbAdmin;
    try {
      if (getAdminApps().length === 0) {
        initAdminApp({
          projectId: firebaseConfig.projectId,
        });
      }
      const configDbId = (firebaseConfig as any).firestoreDatabaseId;
      dbAdmin = getAdminFirestore(configDbId || undefined);
      console.log("Firebase Admin successfully initialized on server.");
      return dbAdmin;
    } catch (error) {
      console.error("Firebase Admin SDK failed to initialize lazy-load:", error);
      return null;
    }
  }

  // Live simulated flight prices
  const LIVE_FLIGHT_PRICES: Record<number, { price: number, airline: string, from: string, to: string }> = {
    1: { price: 1250, airline: 'British Airways', from: 'NYC', to: 'LDN' },
    2: { price: 2100, airline: 'Emirates', from: 'PAR', to: 'DXB' },
    3: { price: 1850, airline: 'ANA', from: 'TYO', to: 'LAX' },
    4: { price: 1950, airline: 'Qatar Airways', from: 'ROM', to: 'MYS' }
  };

  // Simulate flight market price changes
  const updateSimulatedPrices = (forceDrop: boolean = false) => {
    const flightIds = [1, 2, 3, 4];
    const originalPrices: Record<number, number> = { 1: 1250, 2: 2100, 3: 1850, 4: 1950 };
    
    flightIds.forEach(id => {
      const original = originalPrices[id];
      if (forceDrop) {
        // Deep drop (between 12% and 18%)
        const dropRatio = 0.12 + Math.random() * 0.06;
        LIVE_FLIGHT_PRICES[id].price = Math.round(original * (1 - dropRatio));
      } else {
        // Normal fluctuations (30% chance of a drop, otherwise random +/- fluctuation)
        const rnd = Math.random();
        if (rnd < 0.35) {
          const dropRatio = 0.11 + Math.random() * 0.05; // 11% - 16% drops
          LIVE_FLIGHT_PRICES[id].price = Math.round(original * (1 - dropRatio));
        } else {
          const fluctuation = -0.02 + Math.random() * 0.05; // -2% to +3% change
          LIVE_FLIGHT_PRICES[id].price = Math.round(original * (1 + fluctuation));
        }
      }
    });
  };

  // Run price checks across all savedDestinations collections of all users
  const checkPriceDrops = async () => {
    console.log("[CRON] Initiating Flight price drop search sweep...");
    const db = getAdminDb();
    if (!db) {
      console.warn("[CRON] Skipping database check: Firestore admin SDK is unavailable.");
      return { status: "skipped", reason: "Admin SDK not initialized" };
    }

    try {
      // Find saved dest flights across all users by traversing users subcollections
      // This is more robust than collectionGroup which requires complex group indices and permissions
      const usersSnapshot = await db.collection('users').get();
      console.log(`[CRON] Total user accounts to scan for flight updates: ${usersSnapshot.size}`);
      
      let checkedCount = 0;
      let alertsSent = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const flightDocsSnapshot = await db.collection('users').doc(userId).collection('savedDestinations')
          .where('type', '==', 'flight')
          .get();

        checkedCount += flightDocsSnapshot.size;

        for (const d of flightDocsSnapshot.docs) {
          const data = d.data();
          const flightId = Number(data.flightId);
          if (!flightId || isNaN(flightId)) continue;

          const liveItem = LIVE_FLIGHT_PRICES[flightId];
          if (!liveItem) continue;

          const savedPrice = Number(data.price);
          const livePrice = liveItem.price;

          if (!savedPrice || isNaN(savedPrice)) continue;

          const dropAmt = savedPrice - livePrice;
          const dropPercent = dropAmt / savedPrice;

          if (dropPercent >= 0.10) {
            const dropPercentVal = Math.round(dropPercent * 100);
            
            // Write distinct notification avoiding duplicate checks
            const notificationId = `price_drop_${flightId}_${livePrice}`;
            const notifRef = db.collection('users').doc(userId).collection('notifications').doc(notificationId);
            const notifDoc = await notifRef.get();

            if (!notifDoc.exists) {
              console.log(`[ALERT] Notifying UID ${userId}: Flight link ${flightId} dropped by ${dropPercentVal}% (Now $${livePrice}, Saved at $${savedPrice})`);
              
              await notifRef.set({
                type: "price",
                title: `🎉 10%+ Flight Price Drop Alert!`,
                message: `Exciting travel news! Your saved flight to ${data.title || data.location || liveItem.to} via ${liveItem.airline} has plummeted from $${savedPrice} to only $${livePrice} (${dropPercentVal}% discount)! Book today to capitalize on these savings.`,
                read: false,
                createdAt: AdminFieldValue.serverTimestamp()
              });
              alertsSent++;
            }
          }
        }
      }
      return { status: "success", checkedCount, notificationAlertsCreated: alertsSent };
    } catch (e: any) {
      if (e.code === 7 || e.message?.includes("PERMISSION_DENIED") || e.message?.includes("Missing or insufficient permissions")) {
        console.warn("[CRON] Flight database sweep paused: Firestore Admin SDK lacks GCP project level access in this sandbox env. Fallback simulating drops in memory instead.");
        return { status: "skipped", reason: "permission_denied" };
      }
      console.error("[CRON] Flight database sweep crashed:", e);
      return { status: "error", error: e.message };
    }
  };

  // Simulation Endpoints
  app.post("/api/admin/simulate-price-drops", async (req, res) => {
    try {
      updateSimulatedPrices(true); // Force severe price drop (>10%)
      const result = await checkPriceDrops();
      res.json({
        success: true,
        message: "Triggered severe flight price drops market simulation!",
        livePrices: LIVE_FLIGHT_PRICES,
        result
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/live-prices", (req, res) => {
    res.json({ livePrices: LIVE_FLIGHT_PRICES });
  });

  // Launch background intervals
  setInterval(() => {
    updateSimulatedPrices();
    checkPriceDrops().catch(err => console.error("Periodic price drop sweep failed:", err));
  }, 45000); // Sweep database entries periodically (45 seconds)
  // --- END RECURRING PRICING & FLIGHT TRIGGER PIPELINE ---

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
