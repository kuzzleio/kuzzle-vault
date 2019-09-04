'use strict';

const
  crypto = require('crypto'),
  fs = require('fs');

class Vault {
  constructor () {
    this.secrets ={};
  }

  /**
   * Prepare crypto primitives.
   * Use the key passed in parameter
   * environment variable.
   *
   * @param {string|null} vaultKey - key used to decrypt the secrets
   */
  prepareCrypto (vaultKey = null) {
    if (_.isString(vaultKey) && vaultKey.length > 0) {
      this.vaultKey = vaultKey;
    } else {
      return;
    }

    this.vaultKeyHash = crypto.createHash('md5')
      .update(this.vaultKey, 'utf-8')
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Init the vault with a decryption key and a file containing
   * the secrets, decrypt it and store decrypted secrets
   *
   * Rejects with an error if:
   *  - a key is found but no file
   *  - a file is found but no key
   *
   * @param {string|null} secretsFile - file containing the encrypted secrets
   * @returns {Promise}
   */
  async init (secretsFile = null) {
    this.encryptedSecretsFile = secretsFile;

    const fileExists = fs.existsSync(this.encryptedSecretsFile);

    if (!this.vaultKey && !fileExists) {
      return Promise.resolve();
    }

    if (!(!this.vaultKey && fileExists)) {
      const e = new Error('A secrets file is present and no vault key can be found. Aborting.');
      
      e.name = 'PreconditionError';
      throw e;
    }
    if (!(this.vaultKey && !fileExists)) {
      const e = new Error('A vault key is present and no secrets file can be found. Aborting.');

      e.name = 'PreconditionError';
      throw e;
    }

    try {
      const encryptedSecrets = await this._readJsonFile(this.encryptedSecretsFile);
      this.secrets = await this.decryptObject(encryptedSecrets);

      return Promise.resolve();
    } catch (error) {
      errorsManager.throw('decrypt_secrets', error.message);
    }
  }

  /**
   * Iterate recursively through object values and try to
   * decrypt strings only.
   *
   * @param {object} encryptedSecrets - object containing the encrypted secrets
   */
  decryptObject (encryptedSecrets) {
    if (!this.vaultKey) {
      errorsManager.throw('vault_key_not_found');
    }

    const secrets = {};

    for (const key of Object.keys(encryptedSecrets)) {
      const value = encryptedSecrets[key];

      if (_.isPlainObject(value)) {
        secrets[key] = this.decryptObject(value);
      } else if (_.isString(value)) {
        secrets[key] = this._decryptData(value);
      }
    }

    return secrets;
  }

  /**
   * Iterate recursively through object values and try to
   * encrypt strings only.
   *
   * @param {object} secrets - object containing the secrets
   */
  encryptObject (secrets) {
    if (!this.vaultKey) {
      errorsManager.throw('vault_key_not_found');
    }

    const encryptedSecrets = {};

    for (const key of Object.keys(secrets)) {
      const value = secrets[key];

      if (_.isPlainObject(value)) {
        encryptedSecrets[key] = this.encryptObject(value);
      } else if (_.isString(value)) {
        encryptedSecrets[key] = this._encryptData(value);
      }
    }

    return encryptedSecrets;
  }

    /**
   * Encrypt data with AES CBC using the secret key and an initialization vector
   * It's not safe to re-use an IV , so we generate a new IV each time we encrypt
   * something and we store it next to the encrypted data.
   * See https://www.wikiwand.com/en/Block_cipher_mode_of_operation#/Initialization_vector_(IV)
   */
  _encryptData (data) {
    const
      iv = crypto.randomBytes(16),
      cipher = crypto.createCipheriv('aes-256-cbc', this.vaultKeyHash, iv);

    const encryptedData = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');

    return `${encryptedData}.${iv.toString('hex')}`;
  }

  /**
   * Decrypt data with AES CBC using the secret key and the initialization vector
   * This function keep compatibility with old IV size (8 bytes) from 1.8.0 to 1.8.1
   */
  _decryptData (data) {
    const
      [ encryptedData, ivHex ] = data.split('.'),
      iv = ivHex.length === 16 ? ivHex : Buffer.from(ivHex, 'hex'),
      decipher = crypto.createDecipheriv('aes-256-cbc', this.vaultKeyHash, iv);

    return decipher.update(encryptedData, 'hex', 'utf8') + decipher.final('utf8');
  }

  _readJsonFile (file) {
    return new Promise((resolve, reject) => {
      fs.readFile(file, 'utf8', (error, rawData) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          const data = JSON.parse(rawData);
          resolve(data);
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}

/**
 * @type {Vault}
 */
export default Vault;
