/**
 * Cloudflare Worker for L'Oréal Routine Builder
 * This worker receives messages from the frontend and forwards them to OpenAI
 * The OpenAI API key is stored as a Worker Secret (not in code)
 */

/**
 * Handle incoming requests to the Worker
 */
export default {
  async fetch(request, env, ctx) {
    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // Parse the incoming request body
      const { messages } = await request.json();

      // Validate that messages array exists
      if (!messages || !Array.isArray(messages)) {
        return new Response(
          JSON.stringify({ error: "Invalid request: messages array required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Get the OpenAI API key from Worker Secrets
      const openaiKey = env.OPENAI_API_KEY;
      if (!openaiKey) {
        return new Response(
          JSON.stringify({ error: "Server error: OpenAI key not configured" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      // Call OpenAI API with the messages
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini", // Using gpt-4o-mini for cost-effectiveness
            messages: messages, // Forward the messages from the frontend
            temperature: 0.7, // Balanced creativity and consistency
          }),
        },
      );

      // Check if OpenAI API returned an error
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        return new Response(
          JSON.stringify({
            error: "OpenAI API error",
            details: errorData.error?.message || "Unknown error",
          }),
          {
            status: openaiResponse.status,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Parse the OpenAI response
      const openaiData = await openaiResponse.json();

      // Return the response to the frontend
      return new Response(JSON.stringify(openaiData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allow requests from any domain
        },
      });
    } catch (error) {
      // Handle any errors
      return new Response(
        JSON.stringify({
          error: "Server error",
          details: error.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
