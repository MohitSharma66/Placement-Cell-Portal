const crypto = require('crypto');

// Encrypt sensitive data
const encrypt = (text) => {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'fallback_key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('placement-cell'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    data: encrypted,
    authTag: authTag.toString('hex')
  };
};

// Decrypt sensitive data
const decrypt = (encryptedData) => {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'fallback_key', 'salt', 32);
  
  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAAD(Buffer.from('placement-cell'));
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Generate secure tokens
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash data (for non-reversible storage)
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

module.exports = {
  encrypt,
  decrypt,
  generateSecureToken,
  hashData
};