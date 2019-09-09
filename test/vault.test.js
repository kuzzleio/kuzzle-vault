const
  should = require('should'),
  sinon = require('sinon'),
  mockRequire = require('mock-require');

describe('Test: vault core component', () => {
  let
    fsMock,
    clearSecrets,
    encryptedSecrets,
    encryptedSecretsIv8,
    Vault,
    vault;

  beforeEach(() => {
    clearSecrets = {
      aws: {
        keyId: 'key id',
        secretKey: 'very long key 1234567890 1234567890 1234567890'
      },
      deep: { nested: { value: 'nested value' } }
    };

    encryptedSecrets = {
      aws: {
        keyId: 'ac2560ec6b05098a843cdc5ab106bf99.f79775f7fd8fb7c8f456b68741414fcc',
        secretKey: '818b89d7f2c765c1ec2e32813c3b3d009aa32c5fd82765f43fd3a71e2c71d542fd6f236057dcfe88b5692034aba7992f.96c14905dfbe90aa4de931869d63846a'
      },
      deep: {
        nested: {
          value: '2d6e38affac8af21f74aeddd46c8b612.1722fd113c38784d4d177039d7eac48e'
        }
      }
    };

    // Encrypted secrets with 8 bytes IV
    encryptedSecretsIv8 = {
      aws: {
        keyId: '5f71b9bc33a6aea5b0263c9be88c1c4f.786ff771e2760258',
        secretKey: 'f34bc1a69c2df404bf8a7856f0071232525ebc03c4ecb47ad61aedac3519b358a3b37523a7833d3575f9bff17437d7f6.6500cbdee07dc057'
      },
      deep: {
        nested: {
          value: 'dec91b4587ae9eacdee8d7ba309e0f3f.d46c598fcbe46d9c'
        }
      }
    };

    fsMock = {
      existsSync: sinon.stub().returns(true),
      readFileSync: sinon.stub().returns(JSON.stringify(encryptedSecrets)),
      writeFileSync: sinon.stub()
    };

    mockRequire('fs', fsMock);
    Vault = mockRequire.reRequire('../lib/vault');

    vault = new Vault('the spoon does not exists', 'secrets.json', 'secrets.enc.json');
  });

  afterEach(() => {
    mockRequire.stopAll();
  });

  describe('#decrypt', () => {
    it('does nothing if vaultKey and secret file are not present', done => {
      delete vault.vaultKey;
      fsMock.existsSync.returns(false);

      try {
        vault.decrypt();
      } catch (error) {
        should(error.name).be.eql('PreconditionError');
        done();
      }
    });

    it('rejects if vaultKey is present and the secret file is not present', done => {
      fsMock.existsSync.returns(false);

      try {
        vault.decrypt();
      } catch (error) {
        should(error.name).be.eql('PreconditionError');
        done();
      }
    });

    it('reads the secret file and store decrypted secrets', () => {
      vault.decrypt();
      should(vault.secrets).match(clearSecrets);
    });

    it('reads the secret file and store decrypted secrets with old IV size of 8 bytes', () => {
      fsMock.readFileSync.returns(JSON.stringify(encryptedSecretsIv8));

      vault.decrypt();
      should(vault.secrets).match(clearSecrets);
    });
  });

  describe('#encrypt', () => {
    it('should throw an error if no output file is specified', done => {
      vault = new Vault();

      try {
        vault.encrypt();
      } catch (error) {
        should(error.name).be.eql('PreconditionError');
        done();
      }
    });

    it('should throw if file already exist and we do not want to replace it', done => {
      vault = new Vault('the spoon does not exists', 'secrets.json', 'secrets.enc.json');

      try {
        vault.encrypt();
      } catch (error) {
        should(error.name).be.eql('PreconditionError');
        done();
      }
    });

    it('should encrypt', () => {
      fsMock.existsSync.returns(false);
      fsMock.readFileSync.returns(JSON.stringify(clearSecrets));

      vault.encrypt();
      sinon.assert.calledOnce(fsMock.writeFileSync);
    });
  });
});
