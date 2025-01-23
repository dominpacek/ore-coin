import elliptic from "npm:elliptic";

const EC = new elliptic.ec("secp256k1");

const getPublicKey = (aPrivateKey: string): string => {
  return EC.keyFromPrivate(aPrivateKey, "hex").getPublic().encode("hex");
};

const generatePrivateKey = (): string => {
  const keyPair = EC.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

const verifySignature = (publicKey:string, signature:string, messageHash:string): boolean => {
  const key = EC.keyFromPublic(publicKey, 'hex');
  const verified = key.verify(messageHash, signature);
  return verified;
}

export { generatePrivateKey, getPublicKey, verifySignature };
