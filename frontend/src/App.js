import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import io from 'socket.io-client';
import { StatusLogs } from './StatusLogs';

const socket = io.connect('http://localhost:8000')

function App() {
  const [data, setData] = useState();

  const [socketStatus, setSocketStatus] = useState('disconnected');

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server!');
      setSocketStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server!');
      setSocketStatus('disconnected');
    });
  }, []);

  const handleClick = async () => {
    try {
      const socket = io('http://localhost:8000');

      socket.on('connect', () => {
        console.log('Connected to server!');
        setSocketStatus('connected');
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server!');
        setSocketStatus('disconnected');
      });

      const response = await fetch('http://localhost:8000/scrape');

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="App">
      <img src={logo} className="App-logo" alt="logo" />
      <button onClick={() => handleClick()}>fetch</button>
      <p>Socket Status: {socketStatus}</p>
      <StatusLogs socket={socket} />
      <p>{JSON.stringify(data)}</p>
    </div>
  );
}

export default App;
