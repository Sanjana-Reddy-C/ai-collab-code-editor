import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

export function useCollaboration(roomId, username) {
  const { socket } = useSocket();

  const [code, setCode] = useState('// Loading...');
  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [chatMessages, setChatMessages] = useState([]);

  const isApplyingRemote = useRef(false);

  // JOIN ROOM on mount 
  useEffect(() => {
    if (!socket || !roomId || !username) return;

    socket.emit('join-room', { roomId, username });

    return () => {
      // Socket handles disconnect automatically via socket.on('disconnect')
    };
  }, [socket, roomId, username]);

  // SOCKET EVENT LISTENERS
  useEffect(() => {
    if (!socket) return;

    // Server sends full state when you first join
    socket.on('load-state', ({ code, language, users }) => {
      isApplyingRemote.current = true;
      setCode(code);
      setLanguage(language);
      setUsers(users);
      // Small timeout ensures Monaco has mounted before we release the flag
      setTimeout(() => { isApplyingRemote.current = false; }, 100);
    });

    // Another user typed something
    socket.on('code-update', ({ code }) => {
      isApplyingRemote.current = true;  
      setCode(code);                     
      setTimeout(() => {
        isApplyingRemote.current = false; 
      }, 50);
    });

    // Another user moved their cursor
    socket.on('cursor-update', ({ socketId, username, position, selection }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [socketId]: { username, position, selection }
      }));
    });

    // Someone disconnected — remove their cursor
    socket.on('cursor-remove', ({ socketId }) => {
      setRemoteCursors(prev => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
    });

    // User list updates
    socket.on('user-joined', ({ users }) => setUsers(users));
    socket.on('user-left', ({ users }) => setUsers(users));

    // Language changed by someone
    socket.on('language-changed', ({ language }) => setLanguage(language));

    // Chat messages
    socket.on('chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('load-state');
      socket.off('code-update');
      socket.off('cursor-update');
      socket.off('cursor-remove');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('language-changed');
      socket.off('chat-message');
    };
  }, [socket]);

  // OUTGOING ACTIONS 

  // Called by Monaco's onChange
  const handleCodeChange = useCallback((newCode) => {
    // If we're currently applying a remote change, don't emit back
    if (isApplyingRemote.current) return;

    setCode(newCode); // Update local state
    socket?.emit('code-change', { roomId, code: newCode }); 
  }, [socket, roomId]);

  // Called by Monaco's onCursorPositionChange
  const handleCursorChange = useCallback((position, selection) => {
    socket?.emit('cursor-move', { roomId, position, selection });
  }, [socket, roomId]);

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang);
    socket?.emit('language-change', { roomId, language: lang });
  }, [socket, roomId]);

  const sendChatMessage = useCallback((message) => {
    socket?.emit('chat-message', { roomId, message });
  }, [socket, roomId]);

  return {
    code,
    language,
    users,
    remoteCursors,
    chatMessages,
    handleCodeChange,
    handleCursorChange,
    changeLanguage,
    sendChatMessage
  };
}