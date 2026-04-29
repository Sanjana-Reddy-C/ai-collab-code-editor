export default function Toolbar({ language, setLanguage, handleRun }) {
  return (
    <div>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="java">Java</option>
      </select>

      <button onClick={handleRun}>▶ Run Code</button>
    </div>
  );
}