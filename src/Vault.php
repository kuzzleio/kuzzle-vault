<?php

/**
 * Cryptonomicon is a book serie from Neal Stephenson.
 *
 * Between technological thriller and revisited history,
 * Cryptonomicon is a must read for anyone interested in cryptography ;-)
 */
class Cryptonomicon
{
  public $vault_key_hash;

  public $empty_key;

  /**
   * Prepare crypto primitives.
   * Use the key passed in parameter or in environment variable (KUZZLE_VAULT_KEY).
   *
   * @param string $vault_key - key used to decrypt the secrets
   */
  public function __construct ($vault_key = "")
  {
    $key = strlen($vault_key) !== 0 ? $vault_key : getenv('KUZZLE_VAULT_KEY');

    $this->empty_key = strlen($key) === 0;

    $this->vault_key_hash = hex2bin(hash("sha256", $key));
  }

  /**
   * Iterates recursively through object values and tries to
   * decrypt strings only.
   *
   * @param array $encrypted_secrets - object containing the encrypted secrets
   *
   * @return array Object with decrypted values
   */
  public function decrypt_object ($encrypted_secrets, $path = null)
  {
    $secrets = [];

    foreach ($encrypted_secrets as $key => $value)
    {
      $current_path = join(".", ($path == null ? [$key] : [$path, $key]));

      $value_type = gettype($value);

      if ($value_type == "array" || $value_type == "object")
      {
        $secrets[$key] = $this->decrypt_object($value, $current_path);
      }
      else if ($value_type == "string")
      {
        try
        {
          $secrets[$key] = $this->decrypt_string($value);
        }
        catch (Exception $e) {
          throw new Exception("Error when decrypting \"$current_path\": " . $e->getMessage());
        }
      }
    }

    return $secrets;
  }

  /**
   * Iterates recursively through object values and encrypt string values only.
   *
   * @param array $secrets - Object containing secrets to be encrypted
   *
   * @return array Same object but with encrypted string values
   */
  public function encrypt_object ($secrets)
  {
    $encrypted_secrets = [];

    foreach ($secrets as $key => $value)
    {
      $value_type = gettype($value);

      if ($value_type == "array" || $value_type == "object")
      {
        $encrypted_secrets[$key] = $this->encrypt_object($value);
      }
      else if ($value_type == "string")
      {
        $encrypted_secrets[$key] = $this->encrypt_string($value);
      }
    }

    return $encrypted_secrets;
  }

  /**
   * Encrypts data with AES CBC using the secret key and an initialization vector
   * It's not safe to re-use an IV , so we generate a new IV each time we encrypt
   * something and we store it next to the encrypted data.
   * See https://www.wikiwand.com/en/Block_cipher_mode_of_operation#/Initialization_vector_(IV)
   *
   * @param string $decrypted - String to encrypt
   *
   * @return string Encrypted string with IV (format: <encrypted-string>.<iv>)
   */
  public function encrypt_string ($decrypted)
  {
    $iv = openssl_random_pseudo_bytes(16);

    $encrypted = openssl_encrypt(
      $decrypted,
      "aes-256-cbc",
      $this->vault_key_hash,
      $options=OPENSSL_RAW_DATA, $iv);

    return bin2hex($encrypted) . "." . bin2hex($iv);
  }


  /**
   * Decrypts a string with AES CBC using the initialization vector
   * and the sha256 hashed secret key
   *
   * @param string $encrypted - String to decrypt (format: <encrypted-string>.<iv>)
   *
   * @return string Decrypted string
   */
  public function decrypt_string ($encrypted)
  {
    $encrypted_and_iv = explode(".", $encrypted);

    if (strlen($encrypted_and_iv[0]) == 0 || strlen($encrypted_and_iv[1]) == 0)
    {
      throw new Exception("Invalid encrypted string format \"$encrypted\".");
    }

    if (strlen($encrypted_and_iv[1]) != 32)
    {
      throw new Exception("Invalid IV size.");
    }

    $iv = hex2bin($encrypted_and_iv[1]);

    $decrypted = openssl_decrypt(
      hex2bin($encrypted_and_iv[0]),
      "aes-256-cbc",
      $this->vault_key_hash,
      $options=OPENSSL_RAW_DATA,
      $iv);

    if (strlen($decrypted) == 0)
    {
      throw new Exception("Cannot decrypt encrypted string with the provided key.");
    }

    return $decrypted;
  }
}



/**
 * Vault class
 */
class Vault
{
  public $secrets;

  public $cryptonomicon;

  public function __construct($vault_key)
  {
    $KUZZLE_VAULT_KEY = getenv("KUZZLE_VAULT_KEY");

    // delete the key from RAM
    putenv("KUZZLE_VAULT_KEY");

    if (strlen($KUZZLE_VAULT_KEY) > 0) {
      $this->cryptonomicon = new Cryptonomicon($KUZZLE_VAULT_KEY);
    }
    else if (strlen($vault_key) > 0) {
      $this->cryptonomicon = new Cryptonomicon($vault_key);
    }
    else {
      $this->cryptonomicon = new Cryptonomicon("");
    }

    $this->secrets = [];
  }

  /**
   * Decrypts the secrets contained in the provided file
   *
   * @param string $encrypted_vault_path - Path to the file containing the encrypted secrets
   */
  public function decrypt ($encrypted_vault_path)
  {
    if ($this->cryptonomicon->empty_key)
    {
      throw new Exception("No Vault key provided.");
    }

    if (! file_exists($encrypted_vault_path))
    {
      throw new Exception("Unable to find vault at \"$encryptedVaultPath\".");
    }

    $file_content = file_get_contents($encrypted_vault_path);

    $encrypted_secrets = json_decode($file_content);

    $this->secrets = $this->cryptonomicon->decrypt_object($encrypted_secrets);
  }
}