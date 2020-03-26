const should = require('should');
const sinon = require('sinon');
const crypto = require('crypto');

import * as mockfs from 'mock-fs'

import Vault from '../src/Vault'

require('should-sinon');

const keyHash = (str: string) => {
  return Buffer.from(crypto.createHash('sha256').update(str).digest());
};

describe('Vault', () => {
  let encryptedSecrets: any;
  let VaultClass: any;
  let vault: Vault;
  let vaultKey: string;
  let vaultKeyHash: string;

  beforeEach(() => {
    // clearSecrets = {
    //   aws: {
    //     keyId: 'key id',
    //     secretKey: 'very long key 1234567890 1234567890 1234567890'
    //   },
    //   deep: { nested: { value: 'nested value' } }
    // };

    vaultKey = 'the spoon does not exists';

    encryptedSecrets = {
      aws: {
        keyId: 'da4e9dcf3b20ae3901211764c97b954b.4000c14b024ca76b48d922d666624eab',
        secretKey: '7160329ef751a3377354586db9515173991276f5216f73b0789af214c8298f877b08ef6305c1b670c48687d5f2867bb0.d8027bacfeedb64ce54b2d13dd5558bc'
      },
      deep: {
        nested: {
          value: 'be2698fc2840a5d4eec839c5a5963b98.97492d612828b6a1974827a9781c6d35'
        }
      }
    };

    mockfs({
      '/secrets.enc.json': JSON.stringify(encryptedSecrets)
    });
  });


  describe('#constructor', () => {
    it('should use the vault key in parameter', () => {
      vault = new Vault(vaultKey, '/secrets.enc.json');

      should(vault.secrets?.vaultKeyHash).be.eql(keyHash(vaultKey));
    });

    it('should use env variable if provided', () => {
      process.env.KUZZLE_VAULT_KEY = 'bend your reality';

      vault = new Vault(vaultKey, '/secrets.enc.json');

      should(vault.secrets?.vaultKeyHash).be.eql(keyHash('bend your reality'));
      should(process.env.KUZZLE_VAULT_KEY).be.undefined();
    });

    it('should throw in strict mode if there is a vault file and no key', () => {

    });

    it('should throw in strict mode if there is a vault key and no file', () => {

    });
  });

  describe('#decrypt', () => {
    beforeEach(() => {
      vault = new Vault('the spoon does not exists', 'secrets.enc.json');
    });
  })
});
