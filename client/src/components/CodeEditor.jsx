import { useState } from 'react';

export default function CodeEditor({ code, setCode }) {
  return (
    <textarea
      value={code}
      onChange={(e) => setCode(e.target.value)}
      rows={15}
      cols={80}
    />
  );
}