import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { CodemirrorBinding } from 'y-codemirror';

const socket = io('http://localhost:3000', {
  autoConnect: false
});

function connectSocket() {
  const token = sessionStorage.getItem("token");

  if (!token) {
    console.error("❌ No authentication token for Socket.IO");
    return;
  }

  socket.auth = {
    token: token
  };

  if (!socket.connected) {
    socket.connect();
  }
}

let editor;
let currentRoom;
let currentUser;
let isCollaborative = true;
let isApplyingRemote = false;


// ==========================
// JOIN ROOM
// ==========================

function openEditor(roomId, username, collaborative = true) {
  currentRoom = roomId;
  currentUser = username;
  isCollaborative = collaborative;
  sessionStorage.setItem("currentRoom", roomId);
  sessionStorage.setItem("currentCollaborative", collaborative);
  const chatPanel = document.getElementById("chat-panel");
  if (chatPanel) {
    chatPanel.style.display = collaborative ? "flex" : "none";
  }

  // Hide old join screen if it exists
  const joinScreen =
    document.getElementById('join-screen');

  if (joinScreen) {
    joinScreen.style.display = 'none';
  }

  // Show editor
  document.getElementById('editor-screen').style.display = 'flex';

  document.getElementById('room-home-screen').style.display = 'none';

  // Host join requests panel
let requestPanel = document.getElementById("editor-requests-panel");

if (!requestPanel) {
  requestPanel = document.createElement("div");
  requestPanel.id = "editor-requests-panel";

requestPanel.style.display = "none";
requestPanel.style.position = "fixed";
requestPanel.style.top = "70px";
requestPanel.style.left = "50%";
requestPanel.style.transform = "translateX(-50%)";
requestPanel.style.width = "520px";
requestPanel.style.maxWidth = "95vw";
requestPanel.style.maxHeight = "50vh";
requestPanel.style.overflowY = "auto";
requestPanel.style.overflowX = "hidden";
requestPanel.style.boxSizing = "border-box";
requestPanel.style.padding = "16px";
requestPanel.style.background = "#1e293b";
requestPanel.style.border = "1px solid #475569";
requestPanel.style.borderRadius = "12px";
requestPanel.style.zIndex = "9999";
requestPanel.style.color = "white";

  document.body.appendChild(requestPanel);
}

requestPanel.style.display =
  collaborative && hostRoomId ? "block" : "none";
  // Display room
  document.getElementById('room-display').textContent =
    `Room: ${roomId}`;
  // Display room
  document.getElementById('room-display').textContent =
    `Room: ${roomId}`;


  // Update URL
  window.history.pushState({}, '', `?room=${roomId}`);


  // ==========================
  // CODEMIRROR
  // ==========================

  editor = CodeMirror.fromTextArea(
    document.getElementById('code-editor'),
    {
      mode: 'javascript',
      theme: 'dracula',
      lineNumbers: true,
      tabSize: 2,
      autoCloseBrackets: true,
      matchBrackets: true,
      indentWithTabs: false
    }
  );
  const savedCode =
  sessionStorage.getItem(
    `editorCode_${roomId}`
  );

if (savedCode !== null) {
  editor.setValue(savedCode);
}


  // ==========================
  // CODE CHANGE
  // ==========================

  editor.on('change', () => {

    if (isApplyingRemote) {
      return;
    }

    window.lastEditTime = Date.now();

    if (collaborative) {
    socket.emit('code-change', {
    roomId: currentRoom,
    code: editor.getValue(),
    username: currentUser
  });
}
  });


  // ==========================
  // YJS SETUP
  // ==========================

  if (collaborative) {
  const ydoc = new Y.Doc();

  const provider = new WebsocketProvider(
    'ws://localhost:1234',
    currentRoom,
    ydoc
  );

  const yText = ydoc.getText('codemirror');

  const binding = new CodemirrorBinding(
    yText,
    editor,
    provider.awareness
  );
  // Restore room code from server when Yjs starts empty
socket.once('load-code', ({ code }) => {
  if (!yText.toString() && code) {
    yText.insert(0, code);
  }
});

  

  // ==========================
  // SYNC UPDATE TRACKING
  // ==========================

  yText.observe(event => {
    const receiveTime = Date.now();

    console.log(
      'Sync update received at:',
      receiveTime
    );

    if (window.lastEditTime) {
      const latency =
        receiveTime - window.lastEditTime;

      console.log(
        'Approx Sync Latency:',
        latency,
        'ms'
      );
    }
  });
}

  window.editorInstance = editor;


  

  // ==========================
  // SOCKET JOIN
  // ==========================

  if (collaborative) {
  socket.emit('join-room', {
    roomId,
    username
  });
}
}

// ==========================
// USER JOINED
// ==========================

socket.on(
  'user-joined',
  ({ username, userCount }) => {

    document.getElementById(
      'user-count'
    ).textContent =
      `👥 ${userCount} user${userCount > 1 ? 's' : ''}`;

    showToast(
      `${username} joined the room`
    );

  }
);


// ==========================
// USER LEFT
// ==========================

socket.on(
  'user-left',
  ({ username, userCount }) => {

    document.getElementById(
      'user-count'
    ).textContent =
      `👥 ${userCount} user${userCount > 1 ? 's' : ''}`;

    showToast(
      `${username} left the room`
    );

  }
);


// ==========================
// GENERATE ROOM ID
// ==========================

function generateRoomId() {

  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

}


// ==========================
// COPY ROOM LINK
// ==========================

document
  .getElementById('copy-link-btn')
  .addEventListener('click', () => {

    navigator.clipboard.writeText(
      window.location.href
    );

    showToast(
      'Link copied to clipboard!'
    );

  });


// ==========================
// TOAST
// ==========================

function showToast(message) {

  const toast =
    document.createElement('div');

  toast.className = 'toast';

  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(
    () => toast.remove(),
    3000
  );

}


// ==========================
// LOAD ROOM FROM URL
// ==========================

const urlParams =
  new URLSearchParams(
    window.location.search
  );

const roomFromUrl =
  urlParams.get('room');

if (roomFromUrl) {
  const roomInput = document.getElementById('room-input');

  if (roomInput) {
    roomInput.value = roomFromUrl;
  }
}

// ==========================
// RUN CODE
// ==========================

document
  .getElementById('run-btn')
  .addEventListener(
    'click',
    async () => {

      const code =
        editor.getValue();

      const language =
        document.getElementById(
          'language-select'
        ).value;

      const output =
        document.getElementById(
          'output-display'
        );


      console.log(
        'SENDING:',
        {
          code,
          language
        }
      );


      output.textContent =
        'Running...';


      try {

        const response =
          await fetch(
            'http://localhost:3000/run-code',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body: JSON.stringify({
                code,
                language
              })
            }
          );


        const data =
          await response.json();


        console.log(
          'Piston response:',
          data
        );


        const stdout =
          data.run?.stdout || '';

        const stderr =
          data.run?.stderr || '';


        if (stdout) {

          output.textContent =
            stdout;

        } else if (stderr) {

          output.textContent =
            stderr;

        } else {

          output.textContent =
            'No output';

        }


      } catch (err) {

        console.error(
          'Run error:',
          err
        );

        output.textContent =
          'Error running code: ' +
          err.message;

      }

    }
  );


// ==========================
// AI REVIEW BUTTON
// ==========================

setTimeout(() => {

  const aiButton =
    document.getElementById(
      'ai-review-btn'
    );


  if (!aiButton) {

    console.log(
      'AI button not found'
    );

    return;

  }


  aiButton.addEventListener(
    'click',
    async () => {

      aiButton.innerText =
        '⏳ Reviewing...';

      aiButton.style.opacity =
        '0.7';


      const code =
        editor.getValue();


      try {

        const token = sessionStorage.getItem("token");

const response =
  await fetch(
    'http://localhost:3000/api/ai/analyze',
  {
    method: 'POST',

    headers: {
      'Content-Type':
        'application/json',

      'Authorization':
        `Bearer ${token}`
    },

    body: JSON.stringify({
      code,
      roomId: currentRoom
    })
  }
);


        const data =
          await response.json();


        aiButton.style.opacity =
          '1';

        aiButton.innerText =
          '✅ Reviewed';


        setTimeout(() => {

          aiButton.innerText =
            '🤖 AI Review';

        }, 2000);


        showAIReview(
          data.aiResponse ||
          'No AI response'
        );


      } catch (err) {

        console.log(err);


        aiButton.style.opacity =
          '1';

        aiButton.innerText =
          '🤖 AI Review';


        alert('AI Failed');

      }

    }
  );


}, 1000);


// ==========================
// AI REVIEW PANEL
// ==========================

function showAIReview(message) {

  let panel =
    document.getElementById(
      'ai-review-panel'
    );


  if (!panel) {

    panel =
      document.createElement('div');


    panel.id =
      'ai-review-panel';


    panel.style.position =
      'fixed';

    panel.style.top =
      '80px';

    panel.style.right =
      '340px';

    panel.style.width =
      '420px';

    panel.style.height =
      '500px';

    panel.style.background =
      'linear-gradient(135deg,#1e1e2f,#252540)';

    panel.style.color =
      'white';

    panel.style.padding =
      '20px';

    panel.style.borderRadius =
      '18px';

    panel.style.boxShadow =
      '0 10px 40px rgba(0,0,0,0.45)';

    panel.style.backdropFilter =
      'blur(12px)';

    panel.style.transition =
      'all 0.3s ease';

    panel.style.zIndex =
      '9999';

    panel.style.overflowY =
      'auto';

    panel.style.fontFamily =
      'Arial';


    document.body.appendChild(
      panel
    );

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


      <button
        id="close-ai-panel"
        style="
          background:none;
          border:none;
          color:white;
          font-size:22px;
          cursor:pointer;
        "
      >
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

      ${message.replace(
        /\n/g,
        '<br>'
      )}

    </div>

  `;


  document
    .getElementById(
      'close-ai-panel'
    )
    .addEventListener(
      'click',
      () => {

        panel.style.display =
          'none';

      }
    );


  panel.style.display =
    'block';

}
// ==========================
// REAL-TIME ROOM CHAT
// ==========================

const chatInput = document.getElementById("chat-input");
const sendChatBtn = document.getElementById("send-chat-btn");
const chatMessages = document.getElementById("chat-messages");

// SEND CHAT MESSAGE
function sendChatMessage() {
  if (!isCollaborative) return;

  const message = chatInput.value.trim();
  if (!message) return;

  socket.emit("chat-message", {
    roomId: currentRoom,
    username: currentUser,
    message: message
  });

  chatInput.value = "";
  chatInput.focus();
}

// SEND BUTTON
sendChatBtn.addEventListener("click", sendChatMessage);

// ENTER KEY
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendChatMessage();
  }
});

// RECEIVE CHAT MESSAGE
socket.on("chat-message", (data) => {

  if (!isCollaborative) return;

  console.log("🔥 CHAT EVENT RECEIVED:", data);

  const messageDiv = document.createElement("div");

  // My message = right
  // Other user's message = left
  if (data.senderId === socket.id) {
    messageDiv.className = "chat-message sent";
  } else {
    messageDiv.className = "chat-message received";
  }

  const usernameDiv = document.createElement("div");
  usernameDiv.className = "chat-username";

  usernameDiv.textContent =
    data.senderId === socket.id ? "You" : data.username;

  const textDiv = document.createElement("div");
  textDiv.className = "chat-text";
  textDiv.textContent = data.message;

  const timeDiv = document.createElement("div");
  timeDiv.className = "chat-time";
  timeDiv.textContent = data.time || "";

  messageDiv.appendChild(usernameDiv);
  messageDiv.appendChild(textDiv);
  messageDiv.appendChild(timeDiv);

  chatMessages.appendChild(messageDiv);

  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Notification for other users
  if (data.senderId !== socket.id) {
    showChatNotification(
      `${data.username} sent a message`
    );
  }
});

// ==========================
// CHAT NOTIFICATION
// ==========================

function showChatNotification(message) {

  const notification =
    document.createElement("div");

  notification.className =
    "chat-notification";

  notification.textContent =
    "💬 " + message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  setTimeout(() => {

    notification.classList.remove("show");

    setTimeout(() => {
      notification.remove();
    }, 300);

  }, 3000);
}
// =========================================
// AUTHENTICATION UI
// =========================================

const loginScreen = document.getElementById("login-screen");
const registerScreen = document.getElementById("register-screen");
const forgotScreen = document.getElementById("forgot-screen");


// =========================================
// SCREEN SWITCHING
// =========================================

document
  .getElementById("show-register-btn")
  .addEventListener("click", () => {

    loginScreen.style.display = "none";
    forgotScreen.style.display = "none";
    registerScreen.style.display = "flex";

  });


document
  .getElementById("show-login-btn")
  .addEventListener("click", () => {

    registerScreen.style.display = "none";
    forgotScreen.style.display = "none";
    loginScreen.style.display = "flex";

  });


document
  .getElementById("show-forgot-btn")
  .addEventListener("click", () => {

    loginScreen.style.display = "none";
    registerScreen.style.display = "none";
    forgotScreen.style.display = "flex";

  });


document
  .getElementById("back-to-login-btn")
  .addEventListener("click", () => {

    forgotScreen.style.display = "none";
    registerScreen.style.display = "none";
    loginScreen.style.display = "flex";

  });


// =========================================
// PASSWORD SHOW / HIDE
// =========================================

function setupPasswordToggle(buttonId, inputId) {

  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);

  button.addEventListener("click", () => {

    if (input.type === "password") {

      input.type = "text";
      button.textContent = "🙈";

    } else {

      input.type = "password";
      button.textContent = "👁";

    }

  });

}


setupPasswordToggle(
  "login-password-toggle",
  "login-password"
);


setupPasswordToggle(
  "register-password-toggle",
  "register-password"
);


setupPasswordToggle(
  "register-confirm-password-toggle",
  "register-confirm-password"
);
// =========================================
// REGISTER USER
// =========================================

const registerBtn = document.getElementById("register-btn");

registerBtn.addEventListener("click", async () => {

  const username = document
    .getElementById("register-username")
    .value
    .trim();

  const email = document
    .getElementById("register-email")
    .value
    .trim();

  const password = document
    .getElementById("register-password")
    .value;

  const confirmPassword = document
    .getElementById("register-confirm-password")
    .value;

  const message = document.getElementById("register-message");


  // -----------------------------
  // Basic validation
  // -----------------------------

  if (!username || !email || !password || !confirmPassword) {

    message.textContent =
      "Please fill in all fields.";

    message.style.color = "#ff6b6b";

    return;
  }


  // -----------------------------
  // Check passwords
  // -----------------------------

  if (password !== confirmPassword) {

    message.textContent =
      "Passwords do not match.";

    message.style.color = "#ff6b6b";

    return;
  }


  // -----------------------------
  // Disable button
  // -----------------------------

  registerBtn.disabled = true;
  registerBtn.textContent = "Creating account...";


  try {

    const response = await fetch(
      "http://localhost:3000/api/auth/register",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          username,
          email,
          password
        })
      }
    );


    const data = await response.json();


    // -----------------------------
    // Registration failed
    // -----------------------------

    if (!response.ok) {

      message.textContent =
        data.message || "Registration failed.";

      message.style.color = "#ff6b6b";

      registerBtn.disabled = false;
      registerBtn.textContent = "Create Account";

      return;
    }


    // -----------------------------
    // Registration successful
    // -----------------------------

    message.textContent =
      "Account created successfully!";

    message.style.color = "#4ade80";


    // Save JWT token
    sessionStorage.setItem("token", data.token);


    // Save logged-in user
    sessionStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );


    // Go to login after 1.5 seconds
    setTimeout(() => {

      registerScreen.style.display = "none";
      loginScreen.style.display = "flex";

      document.getElementById(
        "login-username"
      ).value = username;

      document.getElementById(
        "login-password"
      ).value = "";

      message.textContent = "";

      registerBtn.disabled = false;
      registerBtn.textContent = "Create Account";

    }, 1500);


  } catch (error) {

    console.error(
      "Registration error:",
      error
    );

    message.textContent =
      "Unable to connect to server.";

    message.style.color = "#ff6b6b";

    registerBtn.disabled = false;
    registerBtn.textContent = "Create Account";

  }

});
// =========================================
// LOGIN USER
// =========================================

const loginBtn = document.getElementById("login-btn");

loginBtn.addEventListener("click", async () => {

  const username = document
    .getElementById("login-username")
    .value
    .trim();

  const password = document
    .getElementById("login-password")
    .value;

  const message = document.getElementById("login-message");


  // -----------------------------
  // Validate fields
  // -----------------------------

  if (!username || !password) {

    message.textContent =
      "Please enter User ID and password.";

    message.style.color = "#ff6b6b";

    return;
  }


  // -----------------------------
  // Disable button
  // -----------------------------

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";


  try {

    const response = await fetch(
      "http://localhost:3000/api/auth/login",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          username,
          password
        })
      }
    );


    const data = await response.json();


    // -----------------------------
    // Login failed
    // -----------------------------

    if (!response.ok) {

      message.textContent =
        data.message || "Login failed.";

      message.style.color = "#ff6b6b";

      loginBtn.disabled = false;
      loginBtn.textContent = "Login";

      return;
    }


    // -----------------------------
    // Login successful
    // -----------------------------

    sessionStorage.setItem(
      "token",
      data.token
    );

    connectSocket();

    sessionStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    sessionStorage.setItem(
      "username",
      data.user.username
    );


    message.textContent =
  "Login successful!";

message.style.color = "#4ade80";

console.log(
  "✅ Login successful:",
  data.user
);

loginBtn.textContent = "Logged in!";


// -----------------------------------------
// GO TO ROOM HOME
// -----------------------------------------

setTimeout(() => {

  loginScreen.style.display = "none";
  forgotScreen.style.display = "none";
  registerScreen.style.display = "none";

  const roomHomeScreen =
    document.getElementById("room-home-screen");

  roomHomeScreen.style.display = "flex";

  document.getElementById(
    "room-home-username"
  ).textContent = data.user.username;

  loginBtn.disabled = false;
  loginBtn.textContent = "Login";

}, 700);

  } catch (error) {

    console.error(
      "❌ Login error:",
      error
    );

    message.textContent =
      "Unable to connect to server.";

    message.style.color = "#ff6b6b";

    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }

});
// =========================================
// FORGOT PASSWORD
// =========================================

const forgotBtn = document.getElementById("forgot-btn");
const resetPasswordBtn = document.getElementById("reset-password-btn");

const forgotRequestSection =
  document.getElementById("forgot-request-section");

const resetPasswordSection =
  document.getElementById("reset-password-section");

const forgotMessage =
  document.getElementById("forgot-message");


// -----------------------------------------
// PASSWORD TOGGLES
// -----------------------------------------

setupPasswordToggle(
  "new-password-toggle",
  "new-password"
);

setupPasswordToggle(
  "confirm-new-password-toggle",
  "confirm-new-password"
);


// -----------------------------------------
// REQUEST PASSWORD RESET
// -----------------------------------------

forgotBtn.addEventListener("click", async () => {

  const identifier =
    document
      .getElementById("forgot-identifier")
      .value
      .trim();

  if (!identifier) {
    forgotMessage.textContent =
      "Please enter your User ID or email.";

    forgotMessage.style.color = "#ff6b6b";
    return;
  }

  forgotBtn.disabled = true;
  forgotBtn.textContent = "Checking...";

  try {

    const response = await fetch(
      "http://localhost:3000/api/auth/forgot-password",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          identifier
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      forgotMessage.textContent =
        data.message || "Unable to find account.";

      forgotMessage.style.color = "#ff6b6b";

      forgotBtn.disabled = false;
      forgotBtn.textContent = "Continue";

      return;
    }


    // -----------------------------------------
    // // RESET EMAIL SENT

    // -----------------------------------------
forgotMessage.textContent =
  data.message || "If an account exists, a password reset link has been sent.";

forgotMessage.style.color = "green";
} catch (error) {
    console.error("Forgot password error:", error);

    forgotMessage.textContent =
      "Unable to connect to server.";

    forgotMessage.style.color = "#ff6b6b";

    forgotBtn.disabled = false;
    forgotBtn.textContent = "Continue";
  }
});

let hostRoomId = null;
// =========================================
// CREATE ROOM
// =========================================

const createRoomBtn =
  document.getElementById("create-room-btn");

createRoomBtn.addEventListener("click", async () => {

  const token = sessionStorage.getItem("token");
  const message =
    document.getElementById("room-home-message");

  if (!token) {
    message.textContent =
      "Please login again.";
    message.style.color = "#ff6b6b";
    return;
  }

  createRoomBtn.disabled = true;
  createRoomBtn.textContent = "Creating Room...";

  try {

    const response = await fetch(
      "http://localhost:3000/api/room/create",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {

      message.textContent =
        data.message || "Failed to create room.";

      message.style.color = "#ff6b6b";

      createRoomBtn.disabled = false;
      createRoomBtn.textContent = "Create Room";

      return;
    }

    console.log("✅ Room created:", data);

    hostRoomId = data.room.roomId;

const username =
  sessionStorage.getItem("username") || "User";

// Enter the editor immediately
openEditor(
  data.room.roomId,
  username
);

  } catch (error) {

    console.error(
      "❌ Create room error:",
      error
    );

    message.textContent =
      "Unable to connect to server.";

    message.style.color = "#ff6b6b";

    createRoomBtn.disabled = false;
    createRoomBtn.textContent = "Create Room";
  }
});
async function loadPendingRequests() {
  const token = sessionStorage.getItem("token");

  if (!token || !hostRoomId || !isCollaborative) return;

  try {
    const response = await fetch(
      `http://localhost:3000/api/room/${hostRoomId}/requests`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Pending requests error:", data.message);
      return;
    }

    const section = document.getElementById(
  "editor-requests-panel"
);

if (!section) return;

section.innerHTML = `
  <h3 style="margin-top:0;">🔔 Join Requests</h3>
`;

const list = document.createElement("div");
section.appendChild(list);

    list.innerHTML = "";

    if (!data.requests || data.requests.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";

    data.requests.forEach((user) => {

  const item = document.createElement("div");

  item.className = "pending-request-card";
  
  item.style.display = "flex";
  item.style.flexDirection = "column";
  item.style.gap = "10px";
  item.style.width = "100%";
  item.style.boxSizing = "border-box";

  const name = document.createElement("strong");

  name.textContent = user.username;


  const email = document.createElement("small");

  email.textContent = user.email;


  const buttons = document.createElement("div");

  buttons.className = "pending-request-buttons";

  buttons.style.display = "flex";
buttons.style.justifyContent = "flex-end";
buttons.style.gap = "8px";
buttons.style.width = "100%";
buttons.style.boxSizing = "border-box";

  const acceptBtn = document.createElement("button");

  acceptBtn.textContent = "✅ Accept";


  const rejectBtn = document.createElement("button");

  rejectBtn.textContent = "❌ Reject";


  acceptBtn.addEventListener("click", async () => {

    const token = sessionStorage.getItem("token");

    try {

      const response = await fetch(
        "http://localhost:3000/api/room/approve",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            roomId: hostRoomId,
            userId: user._id
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Approve error:", data.message);
        return;
      }

      console.log("✅ Request approved:", data);

      loadPendingRequests();

    } catch (error) {

      console.error("❌ Approve request error:", error);

    }

  });


  rejectBtn.addEventListener("click", async () => {

    const token = sessionStorage.getItem("token");

    try {

      const response = await fetch(
        "http://localhost:3000/api/room/reject",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            roomId: hostRoomId,
            userId: user._id
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Reject error:", data.message);
        return;
      }

      console.log("✅ Request rejected:", data);

      loadPendingRequests();

    } catch (error) {

      console.error("❌ Reject request error:", error);

    }

  });


  buttons.appendChild(acceptBtn);

  buttons.appendChild(rejectBtn);


  item.appendChild(name);

  item.appendChild(email);

  item.appendChild(buttons);


  list.appendChild(item);

});

  } catch (error) {
    console.error("❌ Load pending requests error:", error);
  }
}
setInterval(() => {
  if (hostRoomId) {
    loadPendingRequests();
  }
}, 3000);
const joinRoomBtn = document.getElementById("join-room-btn");
document.getElementById("join-room-id").addEventListener("input", () => {
  joinRoomBtn.textContent = "Join Room";
  joinRoomBtn.disabled = false;
});

joinRoomBtn.addEventListener("click", async () => {
  const token = sessionStorage.getItem("token");
  const roomId = document
    .getElementById("join-room-id")
    .value
    .trim()
    .toUpperCase();

  const message =
    document.getElementById("room-home-message");

  if (!token) {
    message.textContent = "Please login again.";
    message.style.color = "#ff6b6b";
    return;
  }

  if (!roomId) {
    message.textContent = "Please enter a Room ID.";
    message.style.color = "#ff6b6b";
    return;
  }

  joinRoomBtn.disabled = true;
  joinRoomBtn.textContent = "Sending Request...";

  try {
    const response = await fetch(
      "http://localhost:3000/api/room/join",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          roomId
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      message.textContent =
        data.message || "Failed to join room.";
      message.style.color = "#ff6b6b";

      joinRoomBtn.disabled = false;
      joinRoomBtn.textContent = "Join Room";
      return;
    }

    console.log("✅ Join request:", data);

    message.textContent =
      data.message || "Join request sent. Waiting for host approval.";

    message.style.color = "#4ade80";

    joinRoomBtn.textContent = "Request Sent";
    sessionStorage.setItem("pendingRoomId", roomId);
    // Check approval status
const checkRequestStatus = setInterval(async () => {
  try {
    const statusResponse = await fetch(
      `http://localhost:3000/api/room/${roomId}/request-status`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    );

    const statusData = await statusResponse.json();

    if (!statusResponse.ok) {
      console.error("❌ Status check error:", statusData.message);
      return;
    }

    console.log("🔍 Request status:", statusData.status);

    if (statusData.status === "approved") {
  clearInterval(checkRequestStatus);

  message.textContent =
    "✅ Request approved! Entering room...";
  message.style.color = "#4ade80";

  const username =
    sessionStorage.getItem("username") || "User";

  document.getElementById("room-home-screen").style.display = "none";

  openEditor(roomId, username);
}

    if (statusData.status === "rejected") {
      clearInterval(checkRequestStatus);

      message.textContent =
        "❌ Your request was rejected by the host.";
      message.style.color = "#ff6b6b";

      joinRoomBtn.textContent = "🔄 Request Again";     
      joinRoomBtn.disabled = false;
    }

  } catch (error) {
    console.error("❌ Request status error:", error);
  }
}, 3000);

  } catch (error) {
    console.error("❌ Join room error:", error);

    message.textContent =
      "Unable to connect to server.";

    message.style.color = "#ff6b6b";

    joinRoomBtn.disabled = false;
    joinRoomBtn.textContent = "Join Room";
  }
});
  // =========================================
// INDEPENDENT CODING
// =========================================

const independentCodeBtn =
  document.getElementById("independent-code-btn");

independentCodeBtn.addEventListener("click", () => {
  const username =
    sessionStorage.getItem("username") || "User";

  const independentRoomId =
    "LOCAL-" +
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  document.getElementById("room-home-screen").style.display = "none";

openEditor(independentRoomId, username, false);

});
// =========================================
// EDITOR LOGOUT
// =========================================

const editorLogoutBtn = document.getElementById("editor-logout-btn");

if (editorLogoutBtn) {
  editorLogoutBtn.addEventListener("click", () => {
    sessionStorage.clear();

    window.location.href = "/";
  });
}
// =========================================
// ROOM HOME LOGOUT
// =========================================

const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "/";
  });
}
async function restorePendingRequest() {
  const token = sessionStorage.getItem("token");
  const pendingRoomId = sessionStorage.getItem("pendingRoomId");

  if (!token || !pendingRoomId) return;

  const message = document.getElementById("room-home-message");
  const joinRoomBtn = document.getElementById("join-room-btn");

  try {
    const response = await fetch(
      `http://localhost:3000/api/room/${pendingRoomId}/request-status`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Restore request error:", data.message);
      return;
    }

    if (data.status === "pending") {
  message.textContent =
    "⏳ Your join request is still waiting for host approval.";
  message.style.color = "#facc15";

  joinRoomBtn.textContent = "Request Sent";
  joinRoomBtn.disabled = true;

  const restoredRequestCheck = setInterval(async () => {
    try {
      const statusResponse = await fetch(
        `http://localhost:3000/api/room/${pendingRoomId}/request-status`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const statusData = await statusResponse.json();

      if (!statusResponse.ok) return;

      console.log(
        "🔍 Restored request status:",
        statusData.status
      );

      if (statusData.status === "approved") {
        clearInterval(restoredRequestCheck);

        sessionStorage.removeItem("pendingRoomId");

        message.textContent =
          "✅ Request approved! Entering room...";
        message.style.color = "#4ade80";

        const username =
          sessionStorage.getItem("username") || "User";

        document.getElementById("room-home-screen").style.display =
          "none";

        openEditor(pendingRoomId, username);
      }

      if (statusData.status === "rejected") {
        clearInterval(restoredRequestCheck);

        sessionStorage.removeItem("pendingRoomId");

        message.textContent =
          "❌ Your request was rejected by the host.";
        message.style.color = "#ff6b6b";

        joinRoomBtn.textContent = "🔄 Request Again";
        joinRoomBtn.disabled = false;
      }

    } catch (error) {
      console.error(
        "❌ Restored request polling error:",
        error
      );
    }
  }, 3000);

  return;
}
    if (data.status === "approved") {
      sessionStorage.removeItem("pendingRoomId");

      message.textContent =
        "✅ Request approved! Entering room...";
      message.style.color = "#4ade80";

      const username =
        sessionStorage.getItem("username") || "User";

      document.getElementById("room-home-screen").style.display = "none";
      openEditor(pendingRoomId, username);

      return;
    }

    if (data.status === "rejected") {
      sessionStorage.removeItem("pendingRoomId");

      message.textContent =
        "❌ Your request was rejected by the host.";
      message.style.color = "#ff6b6b";

      joinRoomBtn.textContent = "🔄 Request Again";
      joinRoomBtn.disabled = false;
    }

  } catch (error) {
    console.error("❌ Restore request status error:", error);
  }
}

restorePendingRequest();
// RESTORE EDITOR AFTER RETURNING FROM DASHBOARD
const savedToken = sessionStorage.getItem("token");
const savedUsername = sessionStorage.getItem("username");
const savedRoom = sessionStorage.getItem("currentRoom");
const savedCollaborative =
  sessionStorage.getItem("currentCollaborative") !== "false";

if (savedToken && savedUsername) {
  loginScreen.style.display = "none";
  registerScreen.style.display = "none";
  forgotScreen.style.display = "none";
  document.getElementById("room-home-screen").style.display = "none";

  connectSocket();

  if (savedRoom) {
    openEditor(
      savedRoom,
      savedUsername,
      savedCollaborative
    );
  } else {
    document.getElementById("room-home-screen").style.display = "flex";
    document.getElementById("room-home-username").textContent =
      savedUsername;
  }
}