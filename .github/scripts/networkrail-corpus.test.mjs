import assert from 'node:assert/strict';
import test from 'node:test';
import { compactCorpus, corpusRows, moduleText } from './build-networkrail-corpus.mjs';

test('CORPUS builder accepts the documented TIPLOCDATA wrapper and keeps useful STANOX data', () => {
  const input = { TIPLOCDATA: [
    { STANOX: '36151', TIPLOC: 'LVRPLSH', '3ALPHA': 'LIV', NLC: '224600', NLCDESC: 'LIVERPOOL LIME STREET' },
    { STANOX: '36151', TIPLOC: 'LVRPLS2', '3ALPHA': ' ', NLC: '224601', NLCDESC: 'LIVERPOOL SECONDARY' },
    { STANOX: '06309', TIPLOC: 'WEST534', '3ALPHA': ' ', NLC: '999819', NLCDESC: 'WESTERTON SIG YH534' },
    { STANOX: '', TIPLOC: 'NOPE', '3ALPHA': 'XXX', NLC: '000000', NLCDESC: 'NO STANOX' }
  ] };
  assert.equal(corpusRows(input).length, 4);
  const map = compactCorpus(input);
  assert.deepEqual(map['36151'], ['LVRPLSH', 'LIV', '224600', 'LIVERPOOL LIME STREET']);
  assert.deepEqual(map['06309'], ['WEST534', '', '999819', 'WESTERTON SIG YH534']);
  assert.equal(Object.keys(map).length, 2);
  assert.match(moduleText(map), /export const CORPUS=/);
});
