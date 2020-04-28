<?php

require "./src/Vault.php";

// Cryptonomicon tests

$secrets = [];
$secrets["api_key"] = "I am the API key";
$secrets["nested"] = [];
$secrets["nested"]["api_key"] = "I am the other API key";

$cryptonomicon = new Cryptonomicon("password");

$encrypted_secrets = $cryptonomicon->encrypt_object($secrets);

$decrypted_secrets = $cryptonomicon->decrypt_object($encrypted_secrets);

assert($decrypted_secrets["api_key"] == "I am the API key");
assert($decrypted_secrets["nested"]["api_key"] == "I am the other API key");

// Vault Tests

$vault = new Vault("password");

$vault->decrypt("./secrets.enc.json");

assert($vault->secrets["api_key"] == "I am the API key");
assert($vault->secrets["nested"]["api_key"] == "I am the other API key");
