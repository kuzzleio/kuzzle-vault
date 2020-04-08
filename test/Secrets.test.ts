const should = require('should');

import { Secrets } from '../src/Secrets'

describe('Secrets', () => {
  const vaultKey = 'the spoon does not exists';
  let decryptedSecrets: any;
  let encryptedSecrets: any;
  let secrets: Secrets;

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

    secrets = new Secrets(vaultKey);
  });

  describe('decryptString', () => {
    it('should decrypt a string', () => {
      const decrypted = secrets.decryptString(encryptedSecrets.aws.keyId);

      should(decrypted).be.eql(decryptedSecrets.aws.keyId);
    });

    it('should raise an error on invalid encrypted string format', () => {
      should(() => {
        secrets.decryptString('invalid.')
      }).throw();

      should(() => {
        secrets.decryptString('.invalid')
      }).throw();

      should(() => {
        secrets.decryptString('valid.too-short-iv')
      }).throw();
    });
  });

  describe('encryptString', () => {
    it('should encrypt a string in correct format', () => {
      const encrypted = secrets.encryptString(decryptedSecrets.aws.keyId);

      const [data, iv] = encrypted.split('.');

      should(data).not.be.empty();
      should(Buffer.from(iv, 'hex').length).be.eql(16);
    });

    it('should encrypt correctly', () => {
      const encrypted = secrets.encryptString(decryptedSecrets.aws.keyId);
      const decrypted = secrets.decryptString(encrypted);

      should(decrypted).be.eql(decryptedSecrets.aws.keyId);
    });
  });

  describe('decryptObject', () => {
    it('should decrypt string values of an object', () => {
      const decrypted = secrets.decryptObject(encryptedSecrets);

      should(decrypted).be.eql(decryptedSecrets);
    });
  });

  describe('encrypt', () => {
    it('should encrypt string values of an object', () => {
      const encrypted = secrets.encryptObject(decryptedSecrets);
      const decrypted = secrets.decryptObject(encrypted);

      should(decrypted).be.eql(decryptedSecrets);
    });
  });

  describe('#decrypt', () => {
    it('should decrypt secrets from JSON string', () => {
      const decrypted = secrets.decrypt(JSON.stringify(encryptedSecrets));

      should(JSON.parse(decrypted)).be.eql(decryptedSecrets);
      should(secrets.decrypted).be.eql(decryptedSecrets);
    });

    it('should raise an error on invalid JSON string', () => {
      should(() => {
        secrets.decrypt(('{Invalid: ['));
      }).throw()
    });
  });

  describe('#encrypt', () => {
    it('should encrypt secrets from JSON string', () => {
      const encrypted = secrets.encrypt(JSON.stringify(decryptedSecrets));

      should(encrypted).be.instanceof(String);
      should(JSON.parse(secrets.decrypt(encrypted))).be.eql(decryptedSecrets);

      should(secrets.encrypted).not.be.empty();
      should(JSON.parse(secrets.decrypt(JSON.stringify(secrets.encrypted))))
        .be.eql(decryptedSecrets);
    });

    it('should raise an error on invalid JSON string', () => {
      should(() => {
        secrets.encrypt(('{Invalid: ['));
      }).throw()
    });
  });
});
