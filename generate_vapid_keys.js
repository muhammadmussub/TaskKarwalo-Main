import crypto from 'crypto';

// Generate VAPID key pair
function generateVAPIDKeys() {
  // Generate a 32-byte random array for the private key
  const privateKey = crypto.randomBytes(32);

  // Derive the public key using ECDSA P-256 curve
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(privateKey);

  const publicKey = ecdh.getPublicKey();

  // Convert to base64url format (RFC 4648)
  const privateKeyBase64 = privateKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const publicKeyBase64 = publicKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  };
}

// Generate and display the keys
const keys = generateVAPIDKeys();
console.log('Generated VAPID Keys:');
console.log('Public Key (for .env file):', keys.publicKey);
console.log('Private Key (for server):', keys.privateKey);
console.log('');
console.log('Key lengths:');
console.log('Public Key length:', keys.publicKey.length);
console.log('Private Key length:', keys.privateKey.length);

// Validate the public key format
const publicKeyBuffer = Buffer.from(keys.publicKey.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
console.log('Public Key decoded length:', publicKeyBuffer.length, 'bytes (should be 65)');
console.log('Valid VAPID key format:', publicKeyBuffer.length === 65);