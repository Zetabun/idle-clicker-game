#!/usr/bin/env node
import net from 'node:net';
import {
  StompFrameParser,
  epochMs,
  parseMovementBatch,
  stompAckFrame,
  stompFrame
} from '../../kerbside-train-movement-worker/movement-core.js';

const HOST = 'publicdatafeeds.networkrail.co.uk';
const PORT = 61618;
const TOPIC = '/topic/TRAIN_MVT_ALL_TOC';
const GAP_MS = Number(process.env.NETWORK_RAIL_REPLAY_GAP_MS) || 120_000;
const SESSION_TIMEOUT_MS = Number(process.env.NETWORK_RAIL_REPLAY_TIMEOUT_MS) || 45_000;
const username = String(process.env.NETWORK_RAIL_USERNAME || '').trim();
const password = String(process.env.NETWORK_RAIL_PASSWORD || '');
if (!username || !password) throw new Error('NETWORK_RAIL_USERNAME and NETWORK_RAIL_PASSWORD are required');
if (GAP_MS >= 5 * 60_000) throw new Error('Replay probe gap must remain below the documented five-minute durable-subscription TTL');

const clientId = `${username}-kerbside-ci-replay-v1`;
const subscriptionId = 'kerbside-ci-replay';
const subscriptionName = 'kerbside-ci-replay-v1';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function recordTimestamp(message) {
  const body = message && message.body || {};
  return epochMs(body.actual_timestamp) || epochMs(body.planned_timestamp) || epochMs(body.gbtt_timestamp) || epochMs(body.origin_dep_timestamp) || null;
}

function queuedEvidence(frame, records, disconnectedAt, reconnectAt) {
  const lower = disconnectedAt - 30_000;
  const upper = reconnectAt - 1_000;
  const headerStamp = epochMs(frame.headers.timestamp);
  if (headerStamp != null && headerStamp >= lower && headerStamp <= upper) {
    return { source: 'stomp-timestamp', timestamp: headerStamp };
  }
  for (const record of records) {
    const stamp = recordTimestamp(record);
    if (stamp != null && stamp >= lower && stamp <= upper) {
      return { source: 'trust-event-timestamp', timestamp: stamp };
    }
  }
  return null;
}

function openSession({ disconnectedAt = 0, reconnectAt = 0, requireQueuedEvidence = false, unsubscribeOnFinish = false } = {}) {
  return new Promise((resolve, reject) => {
    const parser = new StompFrameParser();
    const socket = net.connect({ host: HOST, port: PORT });
    socket.setKeepAlive(true, 15_000);
    socket.setNoDelay(true);
    let connected = false;
    let finished = false;
    let batches = 0;
    let recordsSeen = 0;
    let evidence = null;

    const heartbeat = setInterval(() => {
      if (connected && !socket.destroyed) socket.write('\n');
    }, 15_000);

    const timer = setTimeout(() => finish(new Error(`Replay session timed out after ${SESSION_TIMEOUT_MS}ms (connected=${connected}, batches=${batches}, records=${recordsSeen})`)), SESSION_TIMEOUT_MS);

    function finish(error = null) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearInterval(heartbeat);
      if (unsubscribeOnFinish && connected && !socket.destroyed) {
        try {
          socket.write(stompFrame('UNSUBSCRIBE', {
            id: subscriptionId,
            'activemq.subscriptionName': subscriptionName
          }));
        } catch {}
      }
      try { socket.end(stompFrame('DISCONNECT', { receipt: 'replay-probe-close' })); } catch {}
      setTimeout(() => { try { socket.destroy(); } catch {} }, 100).unref();
      if (error) reject(error);
      else resolve({ batches, records: recordsSeen, evidence });
    }

    socket.on('connect', () => {
      socket.write(stompFrame('CONNECT', {
        'accept-version': '1.2,1.1',
        host: '/',
        login: username,
        passcode: password,
        'client-id': clientId,
        'heart-beat': '15000,15000'
      }));
    });

    socket.on('data', chunk => {
      for (const frame of parser.push(chunk)) {
        if (frame.command === 'CONNECTED') {
          connected = true;
          socket.write(stompFrame('SUBSCRIBE', {
            id: subscriptionId,
            destination: TOPIC,
            ack: 'client-individual',
            'activemq.subscriptionName': subscriptionName
          }));
          continue;
        }
        if (frame.command === 'MESSAGE') {
          batches += 1;
          let records;
          try { records = parseMovementBatch(frame.body); }
          catch (error) { return finish(new Error(`Replay probe received invalid movement JSON: ${error.message}`)); }
          recordsSeen += records.length;
          const ack = stompAckFrame(frame.headers);
          if (ack) socket.write(ack);
          if (requireQueuedEvidence) evidence ||= queuedEvidence(frame, records, disconnectedAt, reconnectAt);
          if (recordsSeen > 0 && (!requireQueuedEvidence || evidence)) return finish();
          continue;
        }
        if (frame.command === 'ERROR') return finish(new Error(`Network Rail STOMP error: ${frame.headers.message || frame.body || 'unknown error'}`));
      }
    });

    socket.on('error', error => finish(error));
    socket.on('close', () => { if (!finished) finish(new Error('Network Rail STOMP socket closed before replay validation completed')); });
  });
}

console.log('Opening durable TRUST subscription and establishing a clean acknowledged baseline...');
const baseline = await openSession();
if (!baseline.records) throw new Error('Baseline session received no TRUST records');
const disconnectedAt = Date.now();
console.log(`Baseline received ${baseline.records} TRUST record(s); intentionally disconnecting for ${Math.round(GAP_MS / 1000)} seconds.`);
await sleep(GAP_MS);
const reconnectAt = Date.now();
console.log('Reconnecting with the same client-id and durable subscription name...');
const replay = await openSession({ disconnectedAt, reconnectAt, requireQueuedEvidence: true, unsubscribeOnFinish: true });
if (!replay.evidence) throw new Error('Reconnected successfully but could not prove that a message from the disconnected interval was replayed');
console.log(`Durable replay verified: ${replay.records} record(s) after reconnect; queued evidence via ${replay.evidence.source} at ${new Date(replay.evidence.timestamp).toISOString()}.`);
