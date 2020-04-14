const should = require('should');

import Cryptonomicon from '../src/Cryptonomicon'

describe('Cryptonomicon', () => {
  const vaultKey = 'the spoon does not exists';
  let decryptedSecrets: any;
  let encryptedSecrets: any;
  let cryptonomicon: Cryptonomicon;

  beforeEach(() => {
    decryptedSecrets = {
      aws: {
        keyId: 'key id',
        secretKey: 'very long key 1234567890 1234567890 1234567890'
      },
      deep: { nested: { value: 'nested value' } }
    };

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

    cryptonomicon = new Cryptonomicon(vaultKey);
  });

  describe('decryptString', () => {
    it('should decrypt a string', () => {
      const decrypted = cryptonomicon.decryptString(encryptedSecrets.aws.keyId);

      should(decrypted).be.eql(decryptedSecrets.aws.keyId);
    });

    it('should raise an error on invalid encrypted string format', () => {
      should(() => {
        cryptonomicon.decryptString('invalid.')
      }).throw();

      should(() => {
        cryptonomicon.decryptString('.invalid')
      }).throw();

      should(() => {
        cryptonomicon.decryptString('valid.too-short-iv')
      }).throw();
    });
  });

  describe('encryptString', () => {
    it('should encrypt a string in correct format', () => {
      const encrypted = cryptonomicon.encryptString(decryptedSecrets.aws.keyId);

      const [data, iv] = encrypted.split('.');

      should(data).not.be.empty();
      should(Buffer.from(iv, 'hex').length).be.eql(16);
    });

    it('should encrypt correctly', () => {
      const encrypted = cryptonomicon.encryptString(decryptedSecrets.aws.keyId);
      const decrypted = cryptonomicon.decryptString(encrypted);

      should(decrypted).be.eql(decryptedSecrets.aws.keyId);
    });
  });

  describe('decryptObject', () => {
    it('should decrypt string values of an object', () => {
      const decrypted = cryptonomicon.decryptObject(encryptedSecrets);

      should(decrypted).be.eql(decryptedSecrets);
    });
  });
});
