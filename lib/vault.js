'use strict';

const
  crypto = require('crypto'),
  fs = require('fs'),
  _ = require('lodash');

class Vault {
  /**
   * Prepare crypto primitives.
   * Use the key passed in parameter
   * environment variable.
   *
   * @param {string|null} vaultKey - key used to decrypt the secrets
   */
  constructor (vaultKey = null, secretsFile = null, encryptedSecretsFile = null) {
    this.secrets = {};
    this._secretsFile = secretsFile;
    this._encryptedSecretsFile = encryptedSecretsFile;

    if (_.isString(vaultKey) && vaultKey.length > 0) {
      this._vaultKey = vaultKey;
    } else {
      return;
    }

    this._vaultKeyHash = crypto.createHash('sha256')
      .update(this._vaultKey, 'utf-8')
      .digest();
    this._vaultKeyHashMD5 = crypto.createHash('md5')
      .update(this._vaultKey, 'utf-8')
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Decrypt secrets and store it
   *
   * Rejects with an error if:
   *  - a key is found but no file
   *  - a file is found but no key
   */
  decrypt () {
    const fileExists = fs.existsSync(this._encryptedSecretsFile);

    if (!fileExists) {
      const e = new Error('No secrets file can be found.');

      e.name = 'PreconditionError';
      throw e;
    }

    const encryptedSecrets = this._readJsonFile(this._encryptedSecretsFile);
    this.secrets = this._decryptObject(encryptedSecrets);
  }

  /**
   * Encrypt the secrets and store it in a file
   *
   * Rejects with an error if:
   *  - a key is found but no file
   *  - a file is found but no key
   *
   * @param {string|null} secretsFile - file containing the encrypted secrets
   */
  encrypt (outputFile = null, replaceFileIfExist = false) {
    const file = outputFile || this._encryptedSecretsFile;

    if (!file) {
      const error = new Error('No outputFile or encryptedSecretsFile specified.');

      error.name = 'PreconditionError';
      throw error;
    }

    const fileExists = fs.existsSync(file);
    if (fileExists && !replaceFileIfExist) {
      const error = new Error('Output file already exists.');

      error.name = 'PreconditionError';
      throw error;
    }

    const secrets = JSON.parse(fs.readFileSync(this._secretsFile, 'utf-8'));
    const encryptedSecrets = this._encryptObject(secrets);
    fs.writeFileSync(file, JSON.stringify(encryptedSecrets, null, 2));
  }

  encryptKey (outputFile = null, path, value) {
    const file = outputFile || this._encryptedSecretsFile;

    if (!file) {
      const error = new Error('No outputFile or encryptedSecretsFile specified.');

      error.name = 'PreconditionError';
      throw error;
    }

    let content = {};

    if (fs.existsSync(file)) {
      content = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }

    _.set(content, path, this._encryptData(value));

    fs.writeFileSync(file, JSON.stringify(content, null, 2));
  }

  decryptKey (inputFile = null, path) {
    const file = inputFile || this._encryptedSecretsFile;

    if (!file) {
      const error = new Error('No inputFile or encryptedSecretsFile specified.');

      error.name = 'PreconditionError';
      throw error;
    }

    if (!fs.existsSync(file)) {
      const error = new Error(`File ${file} does not exists.`);

      error.name = 'PreconditionError';
      throw error;
    }

    const content = JSON.parse(fs.readFileSync(file, 'utf-8'));

    const encryptedValue = _.get(content, path);

    return this._decryptData(encryptedValue);
  }

  /**
   * Iterates recursively through object values and tries to
   * decrypt strings only.
   *
   * @param {object} encryptedSecrets - object containing the encrypted secrets
   */
  _decryptObject (encryptedSecrets) {
    if (!this._vaultKey) {
      const error = new Error('Vault key not found.');

      error.name = 'PreconditionError';
      throw error;
    }

    const secrets = {};

    for (const [key, value] of Object.entries(encryptedSecrets)) {
      if (_.isPlainObject(value)) {
        secrets[key] = this._decryptObject(value);
      } else if (_.isString(value)) {
        secrets[key] = this._decryptData(value);
      }
    }

    return secrets;
  }

  /**
   * Iterates recursively through object values and tries to
   * encrypt strings only.
   *
   * @param {object} secrets - object containing the secrets
   */
  _encryptObject (secrets) {
    if (!this._vaultKey) {
      const error = new Error('Vault key not found.');

      error.name = 'PreconditionError';
      throw error;
    }

    const encryptedSecrets = {};

    for (const key of Object.keys(secrets)) {
      const value = secrets[key];

      if (_.isPlainObject(value)) {
        encryptedSecrets[key] = this._encryptObject(value);
      } else if (_.isString(value)) {
        encryptedSecrets[key] = this._encryptData(value);
      }
    }

    return encryptedSecrets;
  }

  /**
   * Encrypts data with AES CBC using the secret key and an initialization vector
   * It's not safe to re-use an IV , so we generate a new IV each time we encrypt
   * something and we store it next to the encrypted data.
   * See https://www.wikiwand.com/en/Block_cipher_mode_of_operation#/Initialization_vector_(IV)
   */
  _encryptData (data) {
    const
      iv = crypto.randomBytes(16),
      cipher = crypto.createCipheriv('aes-256-cbc', this._vaultKeyHash, iv);

    const encryptedData = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');

    return `${encryptedData}.${iv.toString('hex')}`;
  }

  /**
   * Decrypts data with AES CBC using the given secret key and the initialization vector
   * This function keeps compatibility with old IV size (8 bytes) from 1.8.0 to 1.8.1
   */
  _decryptDataWithKey(data, key) {
    const
      [ encryptedData, ivHex ] = data.split('.'),
      iv = ivHex.length === 16 ? ivHex : Buffer.from(ivHex, 'hex'),
      decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    return decipher.update(encryptedData, 'hex', 'utf8') + decipher.final('utf8');
  }

  /**
   * Decrypts data with AES CBC using the initialization vector and the sha256 hashed secret key
   * or the md5 hashed secrets key if it fails with sha256
   */
  _decryptData (data) {
    try {
      return this._decryptDataWithKey(data, this._vaultKeyHash);
    } catch (e) {
      return this._decryptDataWithKey(data, this._vaultKeyHashMD5);
    }
  }

  _readJsonFile (file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
}

/**
 * @type {Vault}
 */
module.exports = Vault;
