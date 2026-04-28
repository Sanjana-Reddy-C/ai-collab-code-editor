const socket = io('http://localhost:3000');

let editor;           
let currentRoom;
let currentUser;
let isApplyingRemote = false;  

document.getElementById('join-btn').addEventListener('click', () => {
  const username = document.getElementById('username-input').value.trim() || 'Anonymous';

  const roomId = document.getElementById('room-input').value.trim() || generateRoomId();

  currentRoom = roomId;
  currentUser = username;


  document.getElementById('join-screen').style.display = 'none';
  document.getElementById('editor-screen').style.display = 'flex';
  document.getElementById('room-display').textContent = `Room: ${roomId}`;

  
  window.history.pushState({}, '', `?room=${roomId}`);

  
  editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    mode: 'javascript',
    theme: 'dracula',
    lineNumbers: true,
    tabSize: 2,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentWithTabs: false,
  });
  window.editorInstance = editor;

 
  
  editor.on('change', (instance, changeObj) => {
    
    if (isApplyingRemote) return;
    if (changeObj.origin === 'setValue') return; 

    socket.emit('code-change', {
      roomId: currentRoom,
      code: editor.getValue()
    });
  });

 
  socket.emit('join-room', { roomId, username });
});


socket.on('load-code', ({ code }) => {
  if (editor) {
    isApplyingRemote = true;
    editor.setValue(code);
    isApplyingRemote = false;
  }
});


socket.on('code-update', ({ code }) => {
  if (!editor) return;

  
  const cursor = editor.getCursor();

  isApplyingRemote = true;     
  editor.setValue(code);       
  isApplyingRemote = false;  

  editor.setCursor(cursor);    
});

socket.on('user-joined', ({ username, userCount }) => {
  document.getElementById('user-count').textContent = `👥 ${userCount} user${userCount > 1 ? 's' : ''}`;
  showToast(`${username} joined the room`);
});

socket.on('user-left', ({ username, userCount }) => {
  document.getElementById('user-count').textContent = `👥 ${userCount} user${userCount > 1 ? 's' : ''}`;
  showToast(`${username} left the room`);
});


function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

document.getElementById('copy-link-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(window.location.href);
  showToast('Link copied to clipboard!');
});

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}


const urlParams = new URLSearchParams(window.location.search);
const roomFromUrl = urlParams.get('room');
if (roomFromUrl) {
  document.getElementById('room-input').value = roomFromUrl;
}
document.getElementById('run-btn').addEventListener('click', async () => {
  const code = editor.getValue();
  const language = document.getElementById('language-select').value;
  const output = document.getElementById('output-display');

  console.log("SENDING:", { code, language });  // ✅ moved to top so it always logs

  output.textContent = '⏳ Running...';

  try {
    const response = await fetch('http://localhost:3000/run-code', {  // ✅ await added
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language })
    });

    const data = await response.json();  // ✅ 'response' not 'res'

    console.log("Piston response:", data);

    const result =
      data.run?.stdout ||
      data.run?.stderr ||
      'No output';

    output.textContent = result;

  } catch (err) {
    console.error("Run error:", err);    // ✅ shows actual error in console
    output.textContent = 'Error running code: ' + err.message;
  }
});