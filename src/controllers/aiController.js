const { analyzeCode } = require("../../services/aiService");


// =========================
// AI CODE ANALYSIS
// =========================
const analyzeCodeController = async (req, res) => {

  try {

    const { code } = req.body;

    const result = await analyzeCode(code);

    res.json(result);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};


module.exports = {
  analyzeCodeController
};