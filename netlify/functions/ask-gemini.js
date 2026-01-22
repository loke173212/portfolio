exports.handler = async function (event, context) {
  // 1. CORS Headers (Allows your website to access this function)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // 2. Handle "Options" check (Browser pre-flight)
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { userQuery, systemPrompt } = JSON.parse(event.body);
    
    // 3. FIX: Trim whitespace from key to prevent URL breakage
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    
    if (!apiKey) {
      console.error("Error: GEMINI_API_KEY is missing.");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server Error: API Key is missing." }),
      };
    }

    // 4. FIX: Use 'gemini-1.5-flash-latest' which is often more stable for direct URL calls
    // If this still fails, try 'gemini-pro'
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Log the exact error from Google for debugging
      const errorText = await response.text();
      console.error(`Gemini API Error (${response.status}):`, errorText);
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Gemini API Error: ${response.status} ${response.statusText}` }),
      };
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: text }),
    };

  } catch (error) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Internal Server Error: ${error.message}` }),
    };
  }
};
