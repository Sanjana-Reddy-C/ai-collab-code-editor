const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/analyze", async (req, res) => {

  try {

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: "Code is required"
      });
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",

        messages: [
          {
            role: "system",
            content:
              "You are a senior software engineer. Analyze the code. Detect bugs, optimization issues, security issues and improvements."
          },
          {
            role: "user",
            content: code
          }
        ]
      },
      {
        headers: {
          Authorization:
            `Bearer ${process.env.OPENROUTER_API_KEY}`,

          "Content-Type": "application/json"
        }
      }
    );

    const aiResponse =
      response.data.choices[0].message.content;

    res.json({
      aiResponse
    });

  } catch (err) {

    console.log(err.response?.data || err.message);

    res.status(500).json({
      error: "AI analysis failed"
    });

  }

});

module.exports = router;