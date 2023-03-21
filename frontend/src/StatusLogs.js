import React, { useState, useEffect, useMemo, useRef } from 'react';
import './index.css';

export const StatusLogs = ({ socket }) => {
  const [msg, setMsg] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    // this keeps the textarea scroll anchored to the bottom
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [msg]);

  useMemo(() => {
    socket.on('log', (message) => {
      setMsg(prevMsg => prevMsg + '\n\n' + message);
    });
  }, [socket])
  return (
    <textarea ref={textareaRef} value={msg} id="textarea" />
  )
}
