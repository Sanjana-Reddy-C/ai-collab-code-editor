import { useState } from 'react';
import { executeCode } from '../utils/pistonApi';
import Toolbar from './Toolbar';
import Panels from './Panels';
import CodeEditor from './CodeEditor';

export default function EditorRoom() {
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');

const handleRun = async () => {
  console.log("RUN CLICKED");
  console.log("CODE:", code);
  console.log("LANG:", language);

  setOutput('⏳ Running...');
  const code = window.editorInstance.getValue();

  const result = await executeCode(code, language);

  console.log("RESULT:", result);

  setOutput(result.output);
};

  return (
    <>
      <Toolbar 
        language={language}
        setLanguage={setLanguage}
        handleRun={handleRun}
      />

      <CodeEditor code={code} setCode={setCode} />

      <Panels output={output} />
    </>
  );
}