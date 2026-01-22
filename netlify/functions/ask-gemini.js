exports.handler = async function (event, context) {
  // 1. Setup CORS Headers (Allows your website to talk to this function)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // 2. Handle the "Preflight" check (Browser asks: "Can I send data here?")
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  // 3. Security check: Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // 4. Parse the incoming data
    const { userQuery, systemPrompt } = JSON.parse(event.body);
    
    // 5. Check API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server configuration error (Missing API Key)" }),
      };
    }

    // 6. FIXED: Use the correct, stable model name (gemini-1.5-flash)
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      // 'systemInstruction' works with gemini-1.5-flash and pro
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    // 7. Call Gemini API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Gemini API Error: ${response.statusText}` }),
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
