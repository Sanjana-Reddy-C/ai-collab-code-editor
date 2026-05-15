const axios = require("axios");


// =========================
// AI CODE ANALYSIS
// =========================
const analyzeCode = async (code) => {

  try {

    const prompt = `
You are an AI code reviewer.

Analyze this code.

Give:
1. Suggestion
2. Reason

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
        }
      }

    );

    return {
      aiResponse:
        response.data.choices[0].message.content
    };

  } catch (err) {

    console.log(
      "AI Error:",
      err.response?.data || err.message
    );

    return {
      aiResponse: "AI analysis failed"
    };

  }

};


module.exports = {
  analyzeCode
};