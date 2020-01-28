const
  should = require('should'),
  sinon = require('sinon'),
  mockRequire = require('mock-require');

require('should-sinon');

describe('Test: vault core component', () => {
  let
    fsMock,
    clearSecrets,
    encryptedSecrets,
    encryptedSecretsIv8,
    encryptedSecretsSha256,
    encryptedSecretsSha256Iv8,
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

    // Encrypted secrets with MD5 hashed password
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

    // Encrypted secrets with 8 bytes IV and MD5 hashed password
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

    // Encrypted secrets with SHA256 hashed password
    encryptedSecretsSha256 = {
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

    // Encrypted secrets with 8 bytes IV and SHA256 hashed password
    encryptedSecretsSha256Iv8 = {
      aws: {
        keyId: 'b6d4f001f8825802cc550bc1b959e99c.00c8ac5ec21a6f6e',
        secretKey: '1bfd3a80c7bae345b48076914f351522e2bea4dab7572c63342eb5d3a95db2e35d9d66d42d58e2ec057d264725d594ed.9c529964fbb80be1'
      },
      deep: {
        nested: {
          value: '57767336893841dec88ee5babfe591b4.1765cd733e639217'
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

    it('reads the secret file and store decrypted secrets with MD5 hashed password', () => {
      vault.decrypt();
      should(vault.secrets).match(clearSecrets);
    });

    it('reads the secret file and store decrypted secrets with old IV size of 8 bytes and MD5 hashed password', () => {
      fsMock.readFileSync.returns(JSON.stringify(encryptedSecretsIv8));

      vault.decrypt();
      should(vault.secrets).match(clearSecrets);
    });

    it('reads the secret file and store decrypted secrets with SHA256 hashed password', () => {
      fsMock.readFileSync.returns(JSON.stringify(encryptedSecretsSha256));

      vault.decrypt();
      should(vault.secrets).match(clearSecrets);
    });

    it('reads the secret file and store decrypted secrets with old IV size of 8 bytes and SHA256 hashed password', () => {
      fsMock.readFileSync.returns(JSON.stringify(encryptedSecretsSha256Iv8));

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

  describe('#encryptKey', () => {
    it('add an encrypted key in existing file', () => {
      fsMock.existsSync.returns(true);
      fsMock.readFileSync.returns('{ "s4": "hcmc" }');

      vault.encryptKey('aws.s3', 'thao dien', 'file.json');

      should(fsMock.writeFileSync).be.calledOnce();
      const
        [file, rawJson] = fsMock.writeFileSync.getCall(0).args,
        json = JSON.parse(rawJson);

      should(file).be.eql('file.json');
      should(json.aws.s3).not.be.undefined();
    });

    it('create the file if not exists', () => {
      fsMock.existsSync.returns(false);

      vault.encryptKey('aws.s3', 'thao dien', 'file.json');

      should(fsMock.writeFileSync).be.calledOnce();
      const
        [file, rawJson] = fsMock.writeFileSync.getCall(0).args,
        json = JSON.parse(rawJson);

      should(file).be.eql('file.json');
      should(json.aws.s3).not.be.undefined();
    });

    it('throw if file are passed in argument or in constructor', () => {
      fsMock.existsSync.returns(false);
      vault = new Vault('the spoon does not exists');

      should(() => {
        vault.encryptKey('aws.s3', 'thao dien')
      }).throw();
    });

  });

  describe('#decryptKey', () => {
    it('decrypt a key in file', () => {
      fsMock.readFileSync.returns('{ "aws": { "s3": "thao dien" } }');
      vault._decryptData = sinon.stub().returns('decrypted');

      const result = vault.decryptKey('aws.s3', 'file.json');

      should(result).be.eql('decrypted');
      should(vault._decryptData).be.calledWith('thao dien');
    });

    it('throw if file are passed in argument or in constructor', () => {
      fsMock.existsSync.returns(false);
      vault = new Vault('the spoon does not exists');

      should(() => {
        vault.decryptKey('aws.s3');
      }).throw();
    });

    it('throw if file does not exists', () => {
      fsMock.existsSync.returns(false);

      should(() => {
        vault.decryptKey('aws.s3', 'file.json');
      }).throw();
    });
  });
});
