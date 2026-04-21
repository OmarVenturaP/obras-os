/**
 * Utilidad de Criptografía para ObrasOS
 * Usa Web Crypto API (P-256) para firmas digitales offline.
 */

// Configuración de algoritmo
const ALGO = {
  name: "ECDSA",
  namedCurve: "P-256",
  hash: { name: "SHA-256" },
};

/**
 * Genera un par de llaves (Pública/Privada)
 */
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    ALGO,
    true, // Extraíble
    ["sign", "verify"]
  );
  return keyPair;
}

/**
 * Exporta una llave a base64 (SPKI para pública, PKCS8 para privada)
 */
export async function exportKey(key) {
  const format = key.type === "public" ? "spki" : "pkcs8";
  const exported = await window.crypto.subtle.exportKey(format, key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Importa una llave desde base64
 */
export async function importKey(b64, type) {
  const binaryDerString = window.atob(b64);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const format = type === "public" ? "spki" : "pkcs8";
  return await window.crypto.subtle.importKey(
    format,
    binaryDer,
    ALGO,
    true,
    type === "public" ? ["verify"] : ["sign"]
  );
}

/**
 * Firma un objeto JSON
 */
export async function signData(data, privateKey) {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(JSON.stringify(data));
  const signature = await window.crypto.subtle.sign(
    ALGO,
    privateKey,
    encodedData
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verifica una firma de un objeto JSON
 */
export async function verifyData(data, signatureB64, publicKey) {
  try {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    
    const sigString = window.atob(signatureB64);
    const sigBinary = new Uint8Array(sigString.length);
    for (let i = 0; i < sigString.length; i++) {
      sigBinary[i] = sigString.charCodeAt(i);
    }

    return await window.crypto.subtle.verify(
      ALGO,
      publicKey,
      sigBinary,
      encodedData
    );
  } catch (e) {
    console.error("Fallo la verificación criptográfica:", e);
    return false;
  }
}
