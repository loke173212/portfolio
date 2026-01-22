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

  // 3. Method Check
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { userQuery, systemPrompt } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    
    if (!apiKey) {
      console.error("Error: GEMINI_API_KEY is missing.");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server Error: API Key is missing in Netlify." }),
      };
    }

    // 4. MODEL CONFIGURATION
    // We use the standard, stable model name.
    const MODEL_NAME = "gemini-1.5-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    // 5. Call Gemini API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // 6. Error Handling
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini 1.5 Flash Failed (${response.status}):`, errorText);

      // RETRY STRATEGY: If 404, the model name might be wrong or region-locked. 
      // We return the error to the frontend to see it.
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `Gemini API Error: ${response.status} - ${response.statusText}. Check server logs.` 
        }),
      };
    }

    // 7. Success
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
