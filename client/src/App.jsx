import { useState } from "react";
import API from "./services/api";
import "./styles/dashboard.css";

function App() {

  const [code, setCode] = useState("");
  const [result, setResult] = useState("");

  const analyzeCode = async () => {

    try {

      const response = await API.post("/ai/analyze", {
        code,
      });

      setResult(response.data.aiResponse);

    } catch (err) {

      console.log(err);

      setResult("Backend Error");

    }

  };

  return (
  <div className="app-container">

    <div className="topbar">
      <h1>🚀 Collab Editor Pro</h1>
    </div>

    <div className="main-layout">

      <div className="sidebar">
        <h3>Navigation</h3>

        <button>🏠 Editor</button>
        <button>📊 Dashboard</button>
        <button>👥 Users</button>
        <button>🏢 Rooms</button>
        <button>⚡ Sessions</button>
        <button>🧠 AI Insights</button>
      </div>

      <div className="content-area">

        <div className="card">

          <h2>AI Code Reviewer</h2>

          <textarea
            rows="12"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here..."
          />

          <button
            className="analyze-btn"
            onClick={analyzeCode}
          >
            Analyze Code
          </button>

        </div>

        <div className="card">

          <h2>AI Suggestions</h2>

          <pre>{result}</pre>

        </div>

      </div>

    </div>

  </div>
);

export default App;