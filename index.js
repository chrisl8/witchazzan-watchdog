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

// const serverAddress = 'wss://witchazzan-server.ekpyroticfrood.net/';
const serverAddress = 'ws://127.0.0.1:8080';
let ws;
let playerId;
let iAmAlone = true;
let iAmDead = true;
let locationSent = false;
const fireballDirections = ['north', 'south', 'east', 'west'];
let lastFireballDirection = 0;

function handleData(event) {
  dataReceived = true;
  const inputData = JSON.parse(event);
  if (inputData && inputData.messageType) {
    if (inputData.messageType === 'identity') {
      iAmDead = false;
      playerId = inputData.id;
    } else if (
      inputData.messageType === 'game-piece-list' &&
      inputData.pieces &&
      inputData.pieces.length > 0
    ) {
      let foundMyIdInGamePieceList = false;
      let foundOtherPlayers = false;
      inputData.pieces.forEach((piece) => {
        if (piece.type === 'player') {
          if (piece.id === playerId) {
            foundMyIdInGamePieceList = true;
          } else {
            foundOtherPlayers = true;
          }
        } else if (piece.type === 'slime') {
          // TODO: Fire AT the slime.
          const fireballObject = {
            message_type: 'fireball',
            direction: fireballDirections[lastFireballDirection],
            sprite: 'fireball',
          };
          ws.send(JSON.stringify(fireballObject));
          if (lastFireballDirection < fireballDirections.length - 1) {
            lastFireballDirection++;
          } else {
            lastFireballDirection = 0;
          }
        }
      });
      iAmDead = !foundMyIdInGamePieceList;
      iAmAlone = !foundOtherPlayers;
    }
    if (!locationSent) {
      locationSent = true;
      console.log('Sending location');
      // Send initial position
      ws.send(
        JSON.stringify({
          message_type: 'location-update',
          x: 235,
          y: 154,
          scene: 'LoruleH8',
          direction: 'left',
          sprite: 'pantingDog',
          moving: true,
        }),
      );
    }
    if (iAmDead) {
      console.log('Sending Login');
      // Send Login
      ws.send(
        JSON.stringify({
          message_type: 'login',
          username: 'FloofyWoofer',
          password: 'password',
        }),
      );
      locationSent = false;
    }
  }
}

function connectAndWait() {
  connectionRunning = true;
  ws = new WebSocket(serverAddress);

  ws.on('open', async function open() {
    errorCount = 0;
    closedCount = 0;
    // ws.send('something');
    console.log('Sending Login');
    // Send Login
    ws.send(
      JSON.stringify({
        message_type: 'login',
        username: 'FloofyWoofer',
        password: 'password',
      }),
    );
  });

  ws.on('message', handleData);

  ws.on('error', (error) => {
    errorCount++;
    console.log('Connection Error:');
    console.log(error);
  });

  ws.on('close', () => {
    closedCount++;
    console.log('Connection closed.');
    connectionRunning = false;
    iAmDead = true;
    locationSent = false;
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
