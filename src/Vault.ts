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
import Secrets from './Secrets'

export interface VaultOptions {
  strict: boolean;
}

export default class Vault {
  public secrets: Secrets;

  public encryptedVaultPath: string;

  /**
   * Initialize the vault with the provided vault key or with the environment
   * variable KUZZLE_VAULT_KEY
   *
   * @param {String} vaultKey - Vault key (or KUZZLE_VAULT_KEY)
   * @param {String} encryptedVaultPath - Path to secrets file (or KUZZLE_VAULT_PATH)
   * @param {VaultOptions} options
   */
  constructor (vaultKey = '', encryptedVaultPath = '', options: VaultOptions = { strict: true }) {
    const KUZZLE_VAULT_KEY = process.env.KUZZLE_VAULT_KEY;

    // delete the key from RAM
    delete process.env.KUZZLE_VAULT_KEY;

    if (KUZZLE_VAULT_KEY && KUZZLE_VAULT_KEY.length > 0) {
      this.secrets = new Secrets(KUZZLE_VAULT_KEY);
    }
    else if (vaultKey.length > 0) {
      this.secrets = new Secrets(vaultKey);
    }
    else {
      this.secrets = new Secrets();
    }

    this.encryptedVaultPath = process.env.KUZZLE_VAULT_PATH || encryptedVaultPath;

    // prevent vault loading without decryptable secrets
    if (options.strict) {
      const vaultExists = fs.existsSync(this.encryptedVaultPath);

      if (vaultExists && this.secrets.emptyKey) {
        throw new Error('Vault file provided and no Vault key provided');
      }

      if (! this.secrets.emptyKey && ! vaultExists) {
        throw new Error('Vault key provided and no Vault file');
      }
    }
  }

  decrypt (encryptedVaultPath = ''): void {
    if (! this.secrets) {
      throw new Error('No Vault key provided');
    }

    const path = encryptedVaultPath.length > 0
      ? encryptedVaultPath
      : this.encryptedVaultPath;

    if (! fs.existsSync(path)) {
      throw new Error(`Unable to find vault at "${path}"`);
    }

    const encryptedSecretsString = fs.readFileSync(path, 'utf-8');

    this.secrets.decrypt(encryptedSecretsString);
  }
}
