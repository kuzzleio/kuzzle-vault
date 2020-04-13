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

import * as fs from 'fs'
import Cryptonomicon from './Cryptonomicon'

export default class Vault {
  public cryptonomicon: Cryptonomicon;

  public secrets: {};

  /**
   * Initialize the vault with the provided vault key or with the environment
   * variable KUZZLE_VAULT_KEY
   *
   * @param {string|undefined} vaultKey - Vault key
   */
  constructor (vaultKey?: string) {
    const KUZZLE_VAULT_KEY = process.env.KUZZLE_VAULT_KEY;

    // delete the key from RAM
    delete process.env.KUZZLE_VAULT_KEY;

    if (KUZZLE_VAULT_KEY && KUZZLE_VAULT_KEY.length > 0) {
      this.cryptonomicon = new Cryptonomicon(KUZZLE_VAULT_KEY);
    }
    else if (vaultKey) {
      this.cryptonomicon = new Cryptonomicon(vaultKey);
    }
    else {
      this.cryptonomicon = new Cryptonomicon();
    }

    this.secrets = {};
  }

  decrypt (encryptedVaultPath: string): void {
    if (this.cryptonomicon.emptyKey) {
      throw new Error('No Vault key provided');
    }

    if (! fs.existsSync(encryptedVaultPath)) {
      throw new Error(`Unable to find vault at "${encryptedVaultPath}"`);
    }

    let encryptedSecrets;
    try {
      encryptedSecrets = JSON.parse(fs.readFileSync(encryptedVaultPath, 'utf-8'));

    }
    catch (error) {
      throw new Error(`Cannot parse encrypted secrets from file "${encryptedVaultPath}": ${error.message}`);
    }

    this.secrets = this.cryptonomicon.decryptObject(encryptedSecrets);
  }
}

