'use strict';

const assert = require('node:assert/strict');
const merge = require('deepmerge');

// Caso 1: target con prototipo nulo.
const payload = JSON.parse(
  '{"__proto__":{"polluted":"yes"}}'
);

const result = merge(Object.create(null), payload);

assert.equal(result.polluted, undefined);
assert.equal(Object.prototype.polluted, undefined);
assert.equal(Object.getPrototypeOf(result), Object.prototype);

// Caso 2: __proto__ como propiedad propia del target.
const target = {};

Object.defineProperty(target, '__proto__', {
  value: { injected: true },
  enumerable: true,
  configurable: true
});

const second = merge(target, { safe: true });

assert.equal(second.injected, undefined);
assert.equal(Object.getPrototypeOf(second), Object.prototype);
assert.equal(second.safe, true);

// Caso 3: payload anidado.
const nested = merge(
  { session: Object.create(null) },
  JSON.parse('{"session":{"__proto__":{"admin":true}}}')
);

assert.equal(nested.session.admin, undefined);
assert.equal(Object.prototype.admin, undefined);

console.log('PASS: 3 escenarios de prototype pollution.');