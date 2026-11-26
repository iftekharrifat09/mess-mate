const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const backendSource = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

function loadBackendFunction(name) {
  const start = backendSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Expected backend helper ${name} to exist`);
  const openingBrace = backendSource.indexOf('{', start);
  let depth = 0;
  let end = -1;

  for (let index = openingBrace; index < backendSource.length; index += 1) {
    if (backendSource[index] === '{') depth += 1;
    if (backendSource[index] === '}') depth -= 1;
    if (depth === 0) {
      end = index + 1;
      break;
    }
  }

  assert.notEqual(end, -1, `Expected backend helper ${name} to be complete`);
  const context = {};
  vm.runInNewContext(`${backendSource.slice(start, end)}; globalThis.helper = ${name};`, context);
  return context.helper;
}

const resolveDescoAccount = loadBackendFunction('resolveDescoAccount');
const getDescoSetupStatus = loadBackendFunction('getDescoSetupStatus');

test('DESCO account must exactly match an account from the authenticated session', () => {
  const accounts = [
    { accountNo: '26036446', accountId: 781 },
    { accountNo: '99001234', accountId: 992 },
  ];

  assert.equal(resolveDescoAccount(accounts, '26036446').accountId, 781);
  assert.equal(resolveDescoAccount(accounts, '2603644'), null);
  assert.equal(resolveDescoAccount(accounts, '12345678'), null);
  assert.equal(resolveDescoAccount([{ accountNo: '12345678' }], '12345678'), null);
});

test('DESCO setup cannot be account-ready without saved encrypted login credentials', () => {
  assert.deepEqual(
    { ...getDescoSetupStatus({ descoAccountNo: '26036446' }) },
    { accountNo: '', hasSession: false, hasAccount: false, hasCredentials: false },
  );
  assert.deepEqual(
    { ...getDescoSetupStatus({ descoCredentialsEncrypted: { ciphertext: 'encrypted' } }) },
    { accountNo: '', hasSession: true, hasAccount: false, hasCredentials: true },
  );
  assert.deepEqual(
    { ...getDescoSetupStatus({ descoCredentialsEncrypted: { ciphertext: 'encrypted' }, descoAccountNo: '26036446' }) },
    { accountNo: '26036446', hasSession: true, hasAccount: true, hasCredentials: true },
  );
});