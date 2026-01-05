// OTP Storage for password reset
const OTP_STORAGE_KEY = 'mess_manager_otp';
const OTP_EXPIRY_MINUTES = 10;

interface OTPRecord {
  email: string;
  otp: string;
  expiresAt: number;
}

function getOTPRecords(): OTPRecord[] {
  const data = localStorage.getItem(OTP_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveOTPRecords(records: OTPRecord[]): void {
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(records));
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function saveOTP(email: string, otp: string): void {
  const records = getOTPRecords().filter(r => r.email.toLowerCase() !== email.toLowerCase());
  
  records.push({
    email: email.toLowerCase(),
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
  });
  
  saveOTPRecords(records);
}

export function verifyOTP(email: string, otp: string): { valid: boolean; error?: string } {
  const records = getOTPRecords();
  const record = records.find(r => r.email.toLowerCase() === email.toLowerCase());
  
  if (!record) {
    return { valid: false, error: 'No OTP found. Please request a new one.' };
  }
  
  if (Date.now() > record.expiresAt) {
    // Remove expired OTP
    const filtered = records.filter(r => r.email.toLowerCase() !== email.toLowerCase());
    saveOTPRecords(filtered);
    return { valid: false, error: 'OTP has expired. Please request a new one.' };
  }
  
  if (record.otp !== otp) {
    return { valid: false, error: 'Invalid OTP. Please try again.' };
  }
  
  // Remove used OTP
  const filtered = records.filter(r => r.email.toLowerCase() !== email.toLowerCase());
  saveOTPRecords(filtered);
  
  return { valid: true };
}

export function getOTPExpiry(): number {
  return OTP_EXPIRY_MINUTES;
}
