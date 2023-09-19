import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import io from 'socket.io-client';
import { StatusLogs } from './components/StatusLogs';
import { ProgressBar } from './components/ProgressBar';
import { UserInputs } from './components/UserInputs';

const socket = io.connect('http://localhost:8000')

function App() {
  const [data, setData] = useState();
  const [pages, setPages] = useState([]);

  const [pageName, setPageName] = useState('home buyers');
  const [location, setLocation] = useState('Washington DC');
  const [queries, setQueries] = useState(10)
  const [concurrency, setConcurrency] = useState(5);

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
        socket.emit('sendUserInput', { 
          pageName: pageName, 
          queries: queries, 
          location: location, 
          concurrency: concurrency 
        });
        console.log("success emit")
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server!');
        setSocketStatus('disconnected');
      });

      socket.on('pages', (pages) => {
        console.log(pages);
        setPages(pages);
      })

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
      <UserInputs
        pageName={pageName}
        setPageName={setPageName}
        queries={queries}
        setQueries={setQueries}
        location={location}
        setLocation={setLocation}
        concurrency={concurrency}
        setConcurrency={setConcurrency}
      />
      <button onClick={() => handleClick()}>fetch</button>
      <p id="socket-status">Socket Status: {socketStatus}</p>

      <StatusLogs socket={socket} />
      <ProgressBar progress={pages.length} total={10} />

      {/* <p>{JSON.stringify(pages)}</p>
      <p>{JSON.stringify(data)}</p> */}
    </div>
  );
}

export default App;
