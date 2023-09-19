const express = require('express');
const scraper = require('./scraper');
const cors = require('cors');
const app = express();
const PORT = 8000;
const http = require('http');
const { Server } = require('socket.io')

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000'],
    methods: ["GET", "POST"]
}
});

io.on("connection", socket => {
  io.on('sendUserInput', (args) => console.log(args))
  console.log('qwqwq')
})

// todo
io.on('sendUserInput', (b) =>{
})

app.use(cors());

app.get('/scrape', async (req, res) => {
  try {
    const result = await scraper.run(io);
    res.json(result);
  } catch (error) {
    console.error('Error running function:', error);
    res.status(500).send('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log('Server started on port ' + PORT);
});

