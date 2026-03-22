const WEBAUTHN_KEY = "biometric_credential_id";
const WEBAUTHN_EMAIL_KEY = "biometric_email";

export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

export const hasBiometricRegistered = (): boolean => {
  return !!localStorage.getItem(WEBAUTHN_KEY);
};

export const registerBiometric = async (userEmail: string): Promise<boolean> => {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "VentaÁgil", id: window.location.hostname },
        user: {
          id: userId,
          name: userEmail,
          displayName: userEmail
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // solo biometría del dispositivo
          userVerification: "required"
        },
        timeout: 60000
      }
    }) as PublicKeyCredential;

    localStorage.setItem(WEBAUTHN_KEY, credential.id);
    localStorage.setItem(WEBAUTHN_EMAIL_KEY, userEmail);
    return true;
  } catch {
    return false;
  }
};

export const verifyBiometric = async (): Promise<string | null> => {
  try {
    const credentialId = localStorage.getItem(WEBAUTHN_KEY);
    if (!credentialId) return null;

    const challenge = crypto.getRandomValues(new Uint8Array(32));

    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
          type: "public-key"
        }],
        userVerification: "required",
        timeout: 60000
      }
    });

    // Si llega aquí, la biometría fue validada exitosamente
    return localStorage.getItem(WEBAUTHN_EMAIL_KEY);
  } catch {
    return null;
  }
};

export const removeBiometric = (): void => {
  localStorage.removeItem(WEBAUTHN_KEY);
  localStorage.removeItem(WEBAUTHN_EMAIL_KEY);
};
