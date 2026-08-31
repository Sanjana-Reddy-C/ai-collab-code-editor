import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { CodemirrorBinding } from 'y-codemirror'
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
  editor.on('change', () => {

  window.lastEditTime = Date.now();

  socket.emit("code-change", {
    roomId: currentRoom,
    code: editor.getValue(),
    username: currentUser
  });

});
  // ==========================
// YJS SETUP
// ==========================

const ydoc = new Y.Doc()

const provider = new WebsocketProvider(
  'ws://localhost:1234',
  currentRoom,
  ydoc
)

const yText = ydoc.getText('codemirror')

const binding = new CodemirrorBinding(
  yText,
  editor,
  provider.awareness
)
  window.editorInstance = editor;
// ==========================
// YJS METRICS LOGGING
// ==========================

// Connection status
provider.on('status', event => {
  console.log('Yjs Status:', event.status)
})

// Sync update tracking
yText.observe(event => {
  const receiveTime = Date.now()

  console.log('Sync update received at:', receiveTime)

  // Approximate latency calculation
  if (window.lastEditTime) {
    const latency = receiveTime - window.lastEditTime
    console.log('Approx Sync Latency:', latency, 'ms')
  }
})
 
 

 
socket.emit('join-room', {
  roomId,
  username
});
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

  console.log("SENDING:", { code, language });  // moved to top so it always logs

  output.textContent = '⏳ Running...';

  try {
    const response = await fetch('http://localhost:3000/run-code', {  //  await added
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language })
    });

    const data = await response.json();  // 'response' not 'res'

    console.log("Piston response:", data);

    const result =
      data.run?.stdout ||
      data.run?.stderr ||
      'No output';

    output.textContent = result;

  } catch (err) {
    console.error("Run error:", err);    //  shows actual error in console
    output.textContent = 'Error running code: ' + err.message;
  }
});
// ==========================
// AI REVIEW BUTTON
// ==========================

setTimeout(() => {

  const aiButton =
    document.getElementById("ai-review-btn");

  if (!aiButton) {
    console.log("AI button not found");
    return;
  }

  aiButton.addEventListener("click", async () => {

    aiButton.innerText = "⏳ Reviewing...";
    aiButton.style.opacity = "0.7";

    const code = editor.getValue();

    try {

      const response = await fetch(
        "http://localhost:3000/api/ai/analyze",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({ code })
        }
      );

      const data = await response.json();

      aiButton.style.opacity = "1";
      aiButton.innerText = "✅ Reviewed";

      setTimeout(() => {
        aiButton.innerText = "🤖 AI Review";
      }, 2000);

      showAIReview(
        data.aiResponse || "No AI response"
      );

    } catch (err) {

      console.log(err);

      aiButton.style.opacity = "1";
      aiButton.innerText = "🤖 AI Review";

      alert("AI Failed");

    }

  });

}, 1000);
// ==========================
// AI REVIEW PANEL
// ==========================

function showAIReview(message) {

  let panel = document.getElementById("ai-review-panel");

  if (!panel) {

    panel = document.createElement("div");

    panel.id = "ai-review-panel";

    panel.style.position = "fixed";
    panel.style.top = "80px";
    panel.style.right = "340px";
    panel.style.width = "420px";
    panel.style.height = "500px";
    panel.style.background =
  "linear-gradient(135deg,#1e1e2f,#252540)";
    panel.style.color = "white";
    panel.style.padding = "20px";
    panel.style.borderRadius = "18px";
    panel.style.boxShadow =
  "0 10px 40px rgba(0,0,0,0.45)";
    panel.style.backdropFilter = "blur(12px)";
    panel.style.transition = "all 0.3s ease";
    panel.style.zIndex = "9999";
    panel.style.overflowY = "auto";
    panel.style.fontFamily = "Arial";

    document.body.appendChild(panel);

  }

  panel.innerHTML = `
  <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:15px;
  ">
    <h2 style="
      margin:0;
      font-size:24px;
      color:#8ab4ff;
    ">
      🤖 AI Review
    </h2>

    <button id="close-ai-panel" style="
      background:none;
      border:none;
      color:white;
      font-size:22px;
      cursor:pointer;
    ">
      ×
    </button>
  </div>

  <div style="
    background:#2a2a40;
    padding:15px;
    border-radius:10px;
    line-height:1.7;
    font-size:15px;
    color:#f1f1f1;
  ">
    ${message.replace(/\n/g, "<br>")}
  </div>
`;
document
  .getElementById("close-ai-panel")
  .addEventListener("click", () => {
    panel.style.display = "none";
  });

panel.style.display = "block";
}
