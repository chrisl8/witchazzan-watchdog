const exec = require('child_process').exec;
const WebSocket = require('ws');
const wait = require('./wait');

let connectionRunning;
let errorCount = 0;
let closedCount = 0;
let dataReceived;
let noDataReceivedCount = 0;
let firstRun = true;
const restartThreshold = 4;
const loopDuration = 10; // seconds
const sendFireballWhenCountAbove = 1;
let sendFireballCount = 0;

// const serverAddress = 'wss://witchazzan-server.ekpyroticfrood.net/';
const serverAddress = 'ws://127.0.0.1:8080';
let ws;

function connectAndWait() {
  connectionRunning = true;
  ws = new WebSocket(serverAddress);

  ws.on('open', function open() {
    errorCount = 0;
    closedCount = 0;
    // ws.send('something');
    // Send Login
    let obj = {
      message_type: 'login',
      username: 'FloofyWoofer',
      password: 'password',
    };
    ws.send(JSON.stringify(obj));

    // Send initial position
    obj = {
      message_type: 'location-update',
      x: 219.26199999999997,
      y: 138.71637279596976,
      scene: 'LoruleH8',
      direction: 'left',
      sprite: 'pantingDog',
      moving: true,
    };
    ws.send(JSON.stringify(obj));
  });

  ws.on('message', function incoming() {
    dataReceived = true;
    // console.log(data);
  });

  ws.on('error', (error) => {
    errorCount++;
    console.log('Connection Error:');
    console.log(error);
  });

  ws.on('close', () => {
    closedCount++;
    console.log('Connection closed.');
    connectionRunning = false;
  });
}

async function watchdog() {
  // eslint-disable-next-line no-await-in-loop
  while (true) {
    if (!connectionRunning) {
      if (firstRun) {
        firstRun = false;
      } else {
        console.log(
          `Error Count: ${errorCount}, Closed: ${closedCount}, Reconnecting...`,
        );
      }
      connectAndWait();
    } else if (!dataReceived) {
      noDataReceivedCount++;
      console.log(`No Data Received Count: ${noDataReceivedCount}`);
    } else if (dataReceived) {
      dataReceived = false;
      noDataReceivedCount = 0;
      sendFireballCount++;
      if (ws && sendFireballCount > sendFireballWhenCountAbove) {
        // Send fireball periodically to fend off slimes.
        sendFireballCount = 0;
        const obj = {
          message_type: 'fireball',
          direction: 'west',
          sprite: 'fireball',
        };
        ws.send(JSON.stringify(obj));
      }
    }

    if (
      errorCount > restartThreshold ||
      closedCount > restartThreshold ||
      noDataReceivedCount > restartThreshold
    ) {
      errorCount = 0;
      closedCount = 0;
      noDataReceivedCount = 0;
      // TODO: Count server restarts and wipe save file if too many happen.
      console.log('Restarting server...');
      exec('/home/witchazzan/witchazzan-watchdog/sendLogAndRestart.sh');
      // eslint-disable-next-line no-await-in-loop
      await wait(120);
    }

    // eslint-disable-next-line no-await-in-loop
    await wait(loopDuration);
  }
}

if (require.main === module) {
  (async () => {
    try {
      await watchdog();
    } catch (e) {
      console.error('Watchdog failled with error:');
      console.error(e);
      // TODO: Exit with error code
    }
  })();
}

/*
  TODO:
  1. Watchdog:
  If connection fails, loop, if it keeps happening, restart the server.
  If connected, loop and make sure data is coming in, if not, restart the server.
  If connected, send data to server and see response, if not . . .
  Watch for repeated restarts, and if it isn't fixing it, stop, wipe save file, and start
     WARNING: This is drastic, so remove this once our save file matters
  Email/text Christen if it isn't getting fixed

  2. CLI:
  Add ability to interact with the server via the CLI by inputting commands.

  Probably have command line arguments to determine if it is in CLI mode or Watchdog mode.
 */
