const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';

const LANGUAGE_CONFIG = {
  javascript: { language: 'javascript', version: '*',     aliases: ['node', 'js'] },
  python:     { language: 'python',     version: '*',     aliases: ['py']         },
  cpp:        { language: 'c++',        version: '*',     aliases: ['cpp', 'g++'] },
  java:       { language: 'java',       version: '*',     aliases: ['java']       },
  c:          { language: 'c',          version: '*',     aliases: ['gcc']        },
  go:         { language: 'go',         version: '*',     aliases: ['golang']     },
  rust:       { language: 'rust',       version: '*',     aliases: ['rs']         },
  typescript: { language: 'typescript', version: '*',     aliases: ['ts']         },
};

/**
 * Execute code using the Piston API
 * @param {string} code - Source code to execute
 * @param {string} language - Language key from LANGUAGE_CONFIG
 * @param {string} stdin - Optional stdin input
 * @returns {Promise<{stdout, stderr, output, exitCode, isError}>}
 */
export async function executeCode(code, language, stdin = '') {
  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    return {
      output: `❌ Language "${language}" not supported.\nSupported: ${Object.keys(LANGUAGE_CONFIG).join(', ')}`,
      isError: true,
      stdout: '',
      stderr: '',
      exitCode: 1
    };
  }

  try {
    const response = await fetch(PISTON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: config.language,
        version: config.version,
        files: [
          {
            name: getFileName(language),  // e.g. "main.py"
            content: code
          }
        ],
        stdin: stdin,
        args: [],
        compile_timeout: 10000,
        run_timeout: 5000
      })
    });

    //Check if response is OK before parsing 
    if (!response.ok) {
      const errText = await response.text();
      return {
        output: ` Execution server error: ${response.status}\n${errText}`,
        isError: true,
        stdout: '',
        stderr: errText,
        exitCode: 1
      };
    }

    const data = await response.json();
    console.log('[Piston] Raw response:', data); 

    //Properly extract output ─────────────────────────
    // data.run contains { stdout, stderr, code (exit code), signal }
    // data.compile (if compiled language) contains compile output

    const compileErr = data.compile?.stderr || '';
    const stdout = data.run?.stdout || '';
    const stderr = data.run?.stderr || '';
    const exitCode = data.run?.code ?? 0;

    // If there's a compile error, show that first
    if (compileErr) {
      return {
        output: ` Compilation Error:\n${compileErr}`,
        isError: true,
        stdout: '',
        stderr: compileErr,
        exitCode: 1
      };
    }

    // Build combined output (stdout first, then any runtime errors)
    const output = [
      stdout,
      stderr ? `\n Stderr:\n${stderr}` : ''
    ].filter(Boolean).join('') || '(no output)';

    return {
      output,
      stdout,
      stderr,
      exitCode,
      isError: exitCode !== 0 || !!stderr
    };

  } catch (err) {
    // Network error, CORS issue, etc.
    console.error('[Piston] Error:', err);
    return {
      output: `❌ Could not connect to execution server.\n\nError: ${err.message}\n\nMake sure you have internet access.`,
      isError: true,
      stdout: '',
      stderr: err.message,
      exitCode: 1
    };
  }
}

// Returns the right filename so Piston handles compilation correctly
function getFileName(language) {
  const names = {
    javascript: 'main.js',
    python:     'main.py',
    cpp:        'main.cpp',
    java:       'Main.java',  // Java requires filename to match class name
    c:          'main.c',
    go:         'main.go',
    rust:       'main.rs',
    typescript: 'main.ts'
  };
  return names[language] || 'main.txt';
}

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CONFIG);