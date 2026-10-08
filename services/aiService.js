const axios = require("axios");

// =========================
// AI CODE ANALYSIS
// =========================
const analyzeCode = async (code) => {
  if (!code || !code.trim()) {
    throw new Error("Code is required for AI analysis");
  }

  try {
    const prompt = `
You are an AI code reviewer.

Analyze the following code.

Provide:
1. Suggestion
2. Reason

Keep the response clear, practical, and easy to understand.

Code:
${code}
`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    const aiResponse =
      response.data?.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("AI returned an empty response");
    }

    return {
      aiResponse
    };

  } catch (err) {
    console.error(
      "AI Error:",
      err.response?.data || err.message
    );

    throw new Error("AI analysis failed");
  }
};

module.exports = {
  analyzeCode
};