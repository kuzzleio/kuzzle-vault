#!/bin/bash

set -e

npm i -g kourou

export KUZZLE_VAULT_KEY=password

kourou vault:add ./secrets.enc.json api_key "I am the API key"
kourou vault:add ./secrets.enc.json nested.api_key "I am the other API key"

unset KUZZLE_VAULT_KEY

docker-compose run php php ./test/Vault.test.php