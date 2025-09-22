// This is a Netlify serverless function that acts as a secure proxy to the Gemini API.
// It keeps your API key hidden on the server.

// The main function that runs when the endpoint is accessed.
exports.handler = async function (event, context) {
  // Security check: Only allow POST requests to this function.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1. Get the user's question from the request sent by the browser.
    const { userQuery, systemPrompt } = JSON.parse(event.body);
    
    // 2. Securely access your API key from Netlify's environment variables.
    // This key is never exposed to the user's browser.
    const apiKey = process.env.GEMINI_API_KEY;

    // A check to ensure the API key was set correctly in Netlify.
    if (!apiKey) {
      throw new Error("API key is not configured. Please set GEMINI_API_KEY in Netlify.");
    }

    // 3. Prepare the request to send to the real Gemini API.
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    // 4. Call the Gemini API from the server.
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Handle errors from the Gemini API itself.
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Error Response:", errorBody);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `The API call failed: ${response.statusText}` }),
      };
    }

    // 5. Extract the text response from the Gemini API's successful reply.
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a valid response from the AI.";

    // 6. Send only the text answer back to the user's browser.
    return {
      statusCode: 200,
      body: JSON.stringify({ response: text }),
    };

  } catch (error) {
    // Catch any other errors that might occur during the process.
    console.error("Serverless function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred." }),
    };
  }
};

