<p align="center">
  <a href="https://travis-ci.org/kuzzleio/kuzzle-vault">
    <img src="https://travis-ci.org/kuzzleio/kuzzle-vault.svg?branch=master"/>
  </a>
  <a href="https://codecov.io/gh/kuzzleio/kuzzle-vault">
    <img src="https://codecov.io/gh/kuzzleio/kuzzle-vault/branch/master/graph/badge.svg" />
  </a>
  <a href="https://github.com/kuzzleio/kuzzle-vault/blob/master/LICENSE">
    <img alt="undefined" src="https://img.shields.io/github/license/kuzzleio/kuzzle-vault.svg?style=flat">
  </a>
</p>

## About

Kuzzle Vault is a system to securely share your API keys and other secrets within your team.

Secrets are saved in an encrypted JSON file that you can version with your code.

You only need to share one encryption key with your team members.

Then you can load and decrypt the contents of the file into your application memory for secure usage.
___

## Usage

First, you need to encrypt your secrets. The easiest way to do that is to use [Kourou, the Kuzzle CLI](https://github.com/kuzzleio/kourou/#kourou-vaultadd-secrets-file-key-value).

```bash
$ kourou vault:encrypt config/prod/secrets.json --vault-key <password>

 🚀 Kourou - Encrypts an entire file.
 
 [✔] Secrets were successfully encrypted into the file config/prod/secrets.enc.json
```

Then, you can securely store your secrets inside your repository and share them with you team. 

To load the secrets inside an application, instantiate the Vault with the same password as for the encryption.

Then, use the decrypt method with the path of the encrypted secrets file to load the secrets into the memory.  

```js
const vault = new Vault('password');
vault.decrypt('config/prod/secrets.enc.json');

// secrets are now available
vault.secrets
```

You can also provide the password with the environment variable `KUZZLE_VAULT_KEY`.  

```js
// process.env.KUZZLE_VAULT_KEY === 'password'

const vault = new Vault();
vault.decrypt('config/prod/secrets.enc.json');

// secrets are now available
vault.secrets
```

### Secrets file format

The secrets file is in JSON format. String values are encrypted but the key names remain the same.

```json
/* secrets.json */
{
  "aws": {
    "secretKeyId": "lfiduras"
  },
  "cloudinaryKey": "ho-chi-minh"
}
```

Once encrypted, the file looks like the following:

```json
/* secrets.enc.json */
{
  "aws": {
    "secretKeyId": "536553f3181ada6f700cac98100f1266.3181ada66536553f"
  },
  "cloudinaryKey": "f700cac98100f1266536553f3181ada6.6536553f3181ada"
}
```

## Vault class

[Vault.constructor](#constructor)
[Vault.decrypt](#decrypt)

___

### Vault.constructor

The constructor of the `Vault` class.

```js
Vault(vaultKey: string | undefined);
```

**Arguments**

| Name | Type              | Description |
| -------- | ----------------- | ----------- |
| `vaultKey`  | <pre>String</pre> | The key used to encrypt and decrypt secrets   |

#### Usage

```js
const vault = new Vault('my vault key');
```

___

### Vault.decrypt

Decrypts the content of the file designated by `encryptedVaultPath` and store the decrypted content inside the property `secrets` of the `Vault` class.

<br/>

```js
decrypt(encryptedVaultPath: string);
```


#### Usage

```js
const vault = new Vault('my vault key');
vault.decrypt('path/to/secrets.enc.json');

vault.secrets // Contains decrypted secrets
```

## [Cryptonomicon](./src/Cryptonomicon.ts) class

This class contains the cryptography primitives used to encrypt and decrypt the secrets.  

There are 4 methods available:
 - `decryptObject`
 - `encryptObject`
 - `encryptString`
 - `decryptString`

You can use this class to build your own tools to decrypt or encrypt secrets inside your application.
