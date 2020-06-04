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

Kuzzle Vault is a system to **securely share your API keys** and other secrets within your team.

Secrets are saved in **an encrypted JSON file** that you can version alongside your code.

You only need to **share one encryption key** with your team members.

Then you can load and decrypt the contents of the file into your **application memory** for secure usage.

See the related article on [Kuzzle Blog](https://blog.kuzzle.io/share-sensitive-data-with-git-and-cryptography)

Implementations are available for the following languages:
 - [Node.js](https://github.com/kuzzleio/kuzzle-vault/)
 - [PHP](https://github.com/kuzzleio/kuzzle-vault/tree/php)

___

## Usage

### Encrypt your secrets in a JSON file

#### With Kourou (NPM package)

First, you need to encrypt your secrets. The easiest way to do that is to use [Kourou, the Kuzzle CLI](https://github.com/kuzzleio/kourou/#kourou-vaultadd-secrets-file-key-value).

```bash
$ npm install -g kourou

$ kourou vault:encrypt config/prod/secrets.json --vault-key <password>

 🚀 Kourou - Encrypts an entire file.
 
 [✔] Secrets were successfully encrypted into the file config/prod/secrets.enc.json
```

Then, you can securely store your secrets inside your repository and share them with you team. 

#### With Bash

Alternatively, you can also use the [bash script provided](./bin/kuzzle-vault-encrypt-string) in this repository to encrypt a string in Kuzzle Vault format.

It will give you an encrypted string that you have to put in your JSON file containing encrypted secrets.

Example:
```bash
$ bash bin/kuzzle-vault-encrypt-string kuzzle-vault-encrypt-string something_secret vaultKey
cad308c9e857accc2d82dffb70e59dbe1460545372d6c0620dd46136ad16ae44.52a6a6e897696ec45f5715df12818939
```

Then put the encrypted string in a JSON file:
```json
{
  "secret-key": "cad308c9e857accc2d82dffb70e59dbe1460545372d6c0620dd46136ad16ae44.52a6a6e897696ec45f5715df12818939"
}
```

The complete script documentation is available with `bash bin/kuzzle-vault-encrypt-string --help`.

### Use encrypted secrets within your application


To load the secrets inside an application, instantiate the Kuzzle Vault with the same password as for the encryption.

Then, use the decrypt method with the path of the encrypted secrets file to load the secrets into the memory.  

Copy the [Vault.php](src/Vault.php) file into your application and then you can decrypt your secrets:
```php
<?php

require "./src/Vault.php";

$vault = new Vault("password");

$vault->decrypt("./secrets.enc.json");

// secrets are now available in the associative array
$vault->secrets
```

You can also provide the password with the environment variable `KUZZLE_VAULT_KEY`.  

```php
// export KUZZLE_VAULT_KEY === 'password'

<?php

require "./src/Vault.php";

$vault = new Vault();

$vault->decrypt("./secrets.enc.json");
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
    "secretKeyId": "536553f3181ada6f700cac98100f1266.3181ada66536553f6536553f3181ada"
  },
  "cloudinaryKey": "f700cac98100f1266536553f3181ada6.6536553f3181ada3181ada66536553f"
}
```

## Vault class

[Vault.constructor](#vault-constructor)  

[Vault.decrypt](#vault-decrypt)

___

### Vault.constructor

The constructor of the `Vault` class.

```php
public function __construct($vault_key);
```

**Arguments**

| Name | Type              | Description |
| -------- | ----------------- | ----------- |
| `$vault_key`  | <pre>string</pre> | The key used to encrypt and decrypt secrets (optionnal)  |

#### Usage

```php
$vault = new Vault("password");
```

___

### Vault.decrypt

Decrypts the content of the file designated by `$encrypted_vault_path` and store the decrypted content inside the member `secrets` of the `Vault` class.

<br/>

```php
decrypt($encrypted_vault_path);
```


#### Usage

```php
$vault = new Vault("password");

$vault->decrypt("./secrets.enc.json");

$vault->secrets // Contains decrypted secrets
```

## [Cryptonomicon](./src/Vault.php) class

This class contains the cryptography primitives used to encrypt and decrypt the secrets.  

There are 4 methods available:
 - `decrypt_object`
 - `encrypt_object`
 - `encrypt_string`
 - `decrypt_string`

You can use this class to build your own tools to decrypt or encrypt secrets inside your application.
