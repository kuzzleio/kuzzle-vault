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

Kuzzle Vault offers a secure storage system for secrets. It can encrypt inside a file your secrets and also decrypt in memory the encrypted file.

___

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

___

## Api

[Constructor](#constructor)
[Decrypt](#decrypt)
[Encrypt](#encrypt)

___

### Constructor

The constructor of the `Vault` class.

```js
Vault(vaultKey [, secretsFile, encryptedSecretsFile]);
```

**Arguments**

| Name | Type              | Description |
| -------- | ----------------- | ----------- |
| `vaultKey`  | <pre>string</pre> | The key used to encrypt and decrypt secrets   |
| `secretsFile`  | <pre>string</pre> | Optional secrets file   |
| `encryptedSecretsFile`  | <pre>string</pre> | Optional encrypted secrets file   |

**Properties**

| Property | Type | Description |
| `secrets` | <pre>string</pre> | The decrypted secrets after calling [decrypt](#decrypt) |

#### Usage

```js
const vault = new Vault('my vault key', 'secrets.json', 'secrets.enc.json');
```

___

### Decrypt

Decrypt the content of the file designated by `encryptedSecretsFile` in the [constructor](#constructor) and store the decrypted content inside `secrets` of the `Vault` class.

<br/>

```js
decrypt();
```


#### Usage

```js
const vault = new Vault('my vault key', 'secrets.json', 'secrets.enc.json');
vault.decrypt();
console.log(vault.secrets); // Display decrypted secrets
```

___

### Encrypt

Encrypt the content of the file designated by `secretsFile` in the [constructor](#constructor) and store the encrypted content in the file designated by `encryptedSecretsFile` in the [constructor](#constructor) or `outputFile` passed as argument. If the file exists it will be rewritten only if you set the argument `replaceFileIfExist` to `true`.

<br/>

```js
encrypt([outputFile, replaceFileIfExist]);
```

**Arguments**

| Name | Type              | Description |
| -------- | ----------------- | ----------- |
| `outputFile`  | <pre>string</pre> | Optional file used to store the encrypted secrets. If not set `encryptedSecretsFile` from the [constructor](#constructor) will be used instead |
| `replaceFileIfExist`  | <pre>bool</pre> | Optional argument to overwrite the file if it already exists |


#### Usage

```js
const vault = new Vault('my vault key', 'secrets.json', 'secrets.enc.json');
vault.encrypt('new-secrets.enc.json', true);
```
