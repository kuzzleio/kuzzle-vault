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

/**
 * Cryptonomicon is a book serie from Neal Stephenson.
 *
 * Between technological thriller and revisited history,
 * Cryptonomicon is a must read for anyone interested in cryptography ;-)
 */
export default class Cryptonomicon {
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
    if (Array.isArray(encryptedSecrets)) {
      const secrets: any = [];

      for (const value of Object.values(encryptedSecrets)) {
        secrets.push(
          typeof value === 'string'
            ? this.decryptString(value)
            : this.decryptObject(value)
        );
      }

      return secrets;
    }

    const secrets: any = {}

    for (const [key, value] of Object.entries(encryptedSecrets)) {
      secrets[key] = typeof value === 'string'
        ? this.decryptString(value)
        : this.decryptObject(value);
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

    if (encryptedData.length === 0) {
      throw new Error(`Invalid encrypted string format "${encryptedData}.${ivHex}"`);
    }

    if (ivHex.length !== 32) {
      throw new Error(`Invalid IV size. (${ivHex.length}, expected 32)`);
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.vaultKeyHash, iv);

    try {
      return decipher.update(encryptedData, 'hex', 'utf8') + decipher.final('utf8');
    }
    catch (error) {
      if (error.message.includes('bad decrypt')) {
        throw new Error('Cannot decrypt encrypted value with the provided key');
      }

      throw new Error(`Encrypted input value format is not a valid: ${error.message}`);
    }
  }
}