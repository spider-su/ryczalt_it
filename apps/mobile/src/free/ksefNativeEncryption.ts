import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import type { KsefEnvironment, KsefRsaEncryptor } from "./ksefAuth";
import { fetchTokenEncryptionCertificate } from "./ksefEncryption";

type NativeEncryptor = {
  encryptToken(certificateDerBase64: string, plaintext: string): Promise<string>;
};

/**
 * Android platform RSA-OAEP SHA256 encryption is implemented by the local Expo
 * module and Android's JCA provider. Never fall back to JS plaintext transport.
 */
export class KsefAndroidEncryptor implements KsefRsaEncryptor {
  constructor(private readonly request: typeof fetch = fetch) {}
  async encryptTokenWithKsefPublicKey(plaintext: string, environment: KsefEnvironment) {
    if (Platform.OS !== "android") throw new Error("Szyfrowanie KSeF jest dostępne tylko na Androidzie.");
    const native = requireOptionalNativeModule<NativeEncryptor>("RyczaltKsefCrypto");
    if (!native) throw new Error("Moduł szyfrowania KSeF nie jest dostępny. Zainstaluj pełną wersję aplikacji.");
    const selected = await fetchTokenEncryptionCertificate(environment, this.request);
    const encryptedToken = await native.encryptToken(selected.derBase64, plaintext);
    if (!encryptedToken || !/^[A-Za-z0-9+/]+={0,2}$/.test(encryptedToken)) {
      throw new Error("Nie udało się zaszyfrować tokenu KSeF.");
    }
    return { encryptedToken, publicKeyId: selected.publicKeyId };
  }
}
