import crypto from 'crypto';

/**
 * Generate a secure random password
 * @param length - Password length (default: 12)
 * @param includeSymbols - Whether to include special symbols (default: true)
 * @returns A secure random password
 */
export function generateSecurePassword(length: number = 12, includeSymbols: boolean = true): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let charset = lowercase + uppercase + numbers;
  if (includeSymbols) {
    charset += symbols;
  }
  
  let password = '';
  
  // Ensure at least one character from each required set
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  
  if (includeSymbols) {
    password += symbols[crypto.randomInt(symbols.length)];
  }
  
  // Fill the rest randomly
  const remainingLength = length - password.length;
  for (let i = 0; i < remainingLength; i++) {
    password += charset[crypto.randomInt(charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Generate a memorable but secure password
 * @returns A memorable secure password
 */
export function generateMemorablePassword(): string {
  const adjectives = ['Swift', 'Bright', 'Clever', 'Noble', 'Brave', 'Wise', 'Strong', 'Quick'];
  const nouns = ['Eagle', 'Tiger', 'Phoenix', 'Dragon', 'Wolf', 'Lion', 'Falcon', 'Bear'];
  
  const adjective = adjectives[crypto.randomInt(adjectives.length)];
  const noun = nouns[crypto.randomInt(nouns.length)];
  const number = crypto.randomInt(100, 999);
  const symbol = '!@#$%^&*'[crypto.randomInt(8)];
  
  return `${adjective}${noun}${number}${symbol}`;
}