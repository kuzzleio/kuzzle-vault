echo '{' > secrets.enc.json
echo -n '  "api-key": "' >> secrets.enc.json
echo -n "$(bash ./bin/kuzzle-vault-encrypt-string secret_api_key password)" >> secrets.enc.json
echo '"' >> secrets.enc.json
echo '}' >> secrets.enc.json

kourou vault:test secrets.enc.json --vault-key password