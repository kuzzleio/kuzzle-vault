/*
 * Kuzzle, a backend software, self-hostable and ready to use
 * to power modern apps
 *
 * Copyright 2015-2020 Kuzzle
 * mailto: support AT kuzzle.io
 * website: http://kuzzle.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

import * as crypto from 'crypto'

export default class Secrets {
  decrypted: {};

  encrypted: {};

  vaultKeyHash: Buffer;

  emptyKey: boolean;

  /**
   * Prepare crypto primitives.
   * Use the key passed in parameter or in environment variable.
   *
   * @param {string?} vaultKey - key used to decrypt the secrets
   */
  constructor (vaultKey = '') {
    this.emptyKey = vaultKey === '';

    this.vaultKeyHash = crypto.createHash('sha256')
      .update(vaultKey)
      .digest();

    this.decrypted = {};

    this.encrypted = {};
  }

  /**
   * Decrypts secrets from JSON string and store them in the "decrypted" property
   *
   * @param {string} encryptedSecretsString - Encrypted secrets in JSON format
   *
   * @returns {string} JSON string containing decrypted secrets
   */
  decrypt (encryptedSecretsString: string): string {
    try {
      const encryptedSecrets: {} = JSON.parse(encryptedSecretsString);

      this.decrypted = this.decryptObject(encryptedSecrets);

      return JSON.stringify(this.decrypted, null, 2);
    }
    catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Provided string is not a valid JSON string: ${error.message}`)
      }

      throw error;
    }
  }

  /**
   * Encrypts secrets from JSON string
   *
   * @param {string} clearSecretsString - JSON string containing the clear secrets
   *
   * @returns {string} JSON string containing the encrypted secrets
   */
  encrypt (clearSecretsString: string): string {
    try {
      const clearSecrets: {} = JSON.parse(clearSecretsString);

      this.encrypted = this.encryptObject(clearSecrets)

      return JSON.stringify(this.encrypted, null, 2);
    }
    catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Provided string is not a valid JSON string: ${error.message}`)
      }

      throw error;
    }
  }

  /**
   * Iterates recursively through object values and tries to
   * decrypt strings only.
   *
   * @param {object} encryptedSecrets - object containing the encrypted secrets
   *
   * @returns {Object} Object with decrypted values
   */
  decryptObject (encryptedSecrets: any): {} {
    const secrets: any = {};

    for (const key of Object.keys(encryptedSecrets)) {
      const value: string|any = encryptedSecrets[key];

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        secrets[key] = this.decryptObject(value);
      }
      else if (typeof value === 'string') {
        secrets[key] = this.decryptString(value);
      }
    }

    return secrets;
  }

  /**
   * Iterates recursively through object values and encrypt string values only.
   *
   * @param {Object} secrets - Object containing secrets to be encrypted
   *
   * @returns {Object} Same object but with encrypted string values
   */
  encryptObject (secrets: any): {} {
    const encryptedSecrets: any = {};

    for (const key of Object.keys(secrets)) {
      const value: string|any = secrets[key];

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        encryptedSecrets[key] = this.encryptObject(value);
      }
      else if (typeof value === 'string') {
        encryptedSecrets[key] = this.encryptString(value);
      }
    }

    return encryptedSecrets;
  }

  /**
   * Encrypts data with AES CBC using the secret key and an initialization vector
   * It's not safe to re-use an IV , so we generate a new IV each time we encrypt
   * something and we store it next to the encrypted data.
   * See https://www.wikiwand.com/en/Block_cipher_mode_of_operation#/Initialization_vector_(IV)
   *
   * @param {string} decrypted - String to encrypt
   *
   * @returns {string} Encrypted string with IV (format: <encrypted-string>.<iv>)
   */
  encryptString (decrypted: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.vaultKeyHash, iv);

    const encryptedData = cipher.update(decrypted, 'utf8', 'hex') + cipher.final('hex');

    return `${encryptedData}.${iv.toString('hex')}`;
  }


  /**
   * Decrypts a string with AES CBC using the initialization vector
   * and the sha256 hashed secret key
   *
   * @param {string} encrypted - String to decrypt (format: <encrypted-string>.<iv>)
   *
   * @returns {string} Decrypted string
   */
  decryptString (encrypted: string): string {
    const [ encryptedData, ivHex ] = encrypted.split('.');

    if (encryptedData.length === 0 || ivHex.length !== 32) {
      throw new Error(`Invalid encrypted string format "${encryptedData}"`);
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.vaultKeyHash, iv);

    return decipher.update(encryptedData, 'hex', 'utf8') + decipher.final('utf8');
  }
}