#!/usr/bin/env node
import net from 'node:net';
import {
  StompFrameParser,
  parseMovementBatch,
  stompFrame
} from '../kerbside-train-movement-worker/movement-core.js';

const HOST = 'publicdatafeeds.networkrail.co.uk';
const PORT = 61618;
const TOPIC = '/topic/TRAIN_MVT_ALL_TOC';
const TIMEOUT_MS = Number(process.env.NETWORK_RAIL_PROBE_TIMEOUT_MS) || 45_000;
const username = String(process.env.NETWORK_RAIL_USERNAME || '').trim();
const password = String(process.env.NETWORK_RAIL_PASSWORD || '');
if (!username || !password) throw new Error('NETWORK_RAIL_USERNAME and NETWORK_RAIL_PASSWORD are required');

const parser = new StompFrameParser();
let connected = false, messages = 0, records = 0, finished = false;
const socket = net.connect({ host: HOST, port: PORT });
socket.setKeepAlive(true, 15_000);
socket.setNoDelay(true);

function finish(error = null) {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  clearInterval(heartbeat);
  try { socket.end(stompFrame('DISCONNECT', { receipt: 'probe-close' })); } catch {}
  setTimeout(() => { try { socket.destroy(); } catch {} }, 100).unref();
  if (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
  } else {
    console.log(`Network Rail MOVEMENT probe connected; ${messages} STOMP batch(es), ${records} TRUST record(s).`);
  }
}

const timeout = setTimeout(() => {
  if (connected && messages > 0) finish();
  else finish(new Error(`Network Rail MOVEMENT probe timed out after ${TIMEOUT_MS}ms (connected=${connected}, batches=${messages})`));
}, TIMEOUT_MS);
const heartbeat = setInterval(() => { if (connected && !socket.destroyed) socket.write('\n'); }, 15_000);

socket.on('connect', () => {
  socket.write(stompFrame('CONNECT', {
    'accept-version': '1.2,1.1', host: '/', login: username, passcode: password,
    'heart-beat': '15000,15000'
  }));
});
socket.on('data', chunk => {
  for (const frame of parser.push(chunk)) {
    if (frame.command === 'CONNECTED') {
      connected = true;
      console.log(`Connected to Network Rail STOMP ${frame.headers.version || ''} ${frame.headers.server || ''}`.trim());
      socket.write(stompFrame('SUBSCRIBE', { id: 'kerbside-ci-probe', destination: TOPIC, ack: 'auto' }));
    } else if (frame.command === 'MESSAGE') {
      messages += 1;
      try { records += parseMovementBatch(frame.body).length; }
      catch (error) { return finish(new Error(`MOVEMENT feed returned invalid JSON: ${error.message}`)); }
      if (records > 0) finish();
    } else if (frame.command === 'ERROR') {
      finish(new Error(`Network Rail STOMP error: ${frame.headers.message || frame.body || 'unknown error'}`));
    }
  }
});
socket.on('error', error => finish(error));
socket.on('close', () => { if (!finished) finish(new Error('Network Rail STOMP socket closed before a movement batch was received')); });
