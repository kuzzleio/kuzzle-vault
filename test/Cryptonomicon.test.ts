// eslint-disable-next-line
const should = require("should");

import Cryptonomicon, { CryptonomiconCipher } from "../src/Cryptonomicon";

describe("Cryptonomicon", () => {
  const vaultKey = "the spoon does not exists";
  let decryptedSecrets: any;
  let encryptedSecretsCBC: any;

  beforeEach(() => {
    decryptedSecrets = {
      aws: {
        keyId: "key id",
        secretKey: "very long key 1234567890 1234567890 1234567890",
      },
      deep: { nested: { value: "nested value" } },
    };

    encryptedSecretsCBC = {
      aws: {
        keyId:
          "da4e9dcf3b20ae3901211764c97b954b.4000c14b024ca76b48d922d666624eab",
        secretKey:
          "7160329ef751a3377354586db9515173991276f5216f73b0789af214c8298f877b08ef6305c1b670c48687d5f2867bb0.d8027bacfeedb64ce54b2d13dd5558bc",
      },
      deep: {
        nested: {
          value:
            "be2698fc2840a5d4eec839c5a5963b98.97492d612828b6a1974827a9781c6d35",
        },
      },
    };
  });

  function runCipherTests(cipher: CryptonomiconCipher) {
    describe(`Cipher: ${cipher}`, () => {
      let cryptonomicon: Cryptonomicon;

      beforeEach(() => {
        cryptonomicon = new Cryptonomicon(vaultKey, { cipher });
      });

      describe("decryptString", () => {
        it("should decrypt a string (if CBC with hardcoded old string, if GCM with dynamically encrypted string)", () => {
          let encryptedString;
          if (cipher === CryptonomiconCipher.AES_256_CBC) {
            encryptedString = encryptedSecretsCBC.aws.keyId;
          } else {
            encryptedString = cryptonomicon.encryptString(
              decryptedSecrets.aws.keyId,
            );
          }
          const decrypted = cryptonomicon.decryptString(encryptedString);

          should(decrypted).be.eql(decryptedSecrets.aws.keyId);
        });

        it("should raise an error on invalid encrypted string format", () => {
          should(() => {
            cryptonomicon.decryptString("invalid.");
          }).throw();

          should(() => {
            cryptonomicon.decryptString(".invalid");
          }).throw();

          if (cipher === CryptonomiconCipher.AES_256_CBC) {
            should(() => {
              cryptonomicon.decryptString("valid.too-short-iv");
            }).throw();
            should(() => {
              cryptonomicon.decryptString("valid.iv.authtag");
            }).throw();
          } else if (cipher === CryptonomiconCipher.AES_256_GCM) {
            should(() => {
              cryptonomicon.decryptString("valid.too-short-iv.authtag");
            }).throw();
            should(() => {
              cryptonomicon.decryptString("valid.iv");
            }).throw();
          }
        });
      });

      describe("encryptString", () => {
        it("should encrypt a string in correct format", () => {
          const encrypted = cryptonomicon.encryptString(
            decryptedSecrets.aws.keyId,
          );

          const parts = encrypted.split(".");

          if (cipher === CryptonomiconCipher.AES_256_CBC) {
            should(parts.length).be.eql(2);
            should(parts[0]).not.be.empty();
            should(Buffer.from(parts[1], "hex").length).be.eql(16);
          } else {
            should(parts.length).be.eql(3);
            should(parts[0]).not.be.empty();
            should(Buffer.from(parts[1], "hex").length).be.eql(16);
            should(parts[2]).not.be.empty();
          }
        });

        it("should encrypt correctly", () => {
          const encrypted = cryptonomicon.encryptString(
            decryptedSecrets.aws.keyId,
          );
          const decrypted = cryptonomicon.decryptString(encrypted);

          should(decrypted).be.eql(decryptedSecrets.aws.keyId);
        });
      });

      describe("decryptObject", () => {
        it("should decrypt string values of an object", () => {
          let encryptedObj;
          if (cipher === CryptonomiconCipher.AES_256_CBC) {
            encryptedObj = encryptedSecretsCBC;
          } else {
            encryptedObj = cryptonomicon.encryptObject(decryptedSecrets);
          }
          const decrypted = cryptonomicon.decryptObject(encryptedObj);

          should(decrypted).be.eql(decryptedSecrets);
        });
      });
    });
  }

  runCipherTests(CryptonomiconCipher.AES_256_CBC);
  runCipherTests(CryptonomiconCipher.AES_256_GCM);
});
