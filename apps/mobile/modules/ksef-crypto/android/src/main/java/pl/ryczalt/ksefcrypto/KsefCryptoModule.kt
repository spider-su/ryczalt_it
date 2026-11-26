package pl.ryczalt.ksefcrypto

import android.util.Base64
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayInputStream
import java.nio.charset.StandardCharsets
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import javax.crypto.Cipher
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource
import java.security.spec.MGF1ParameterSpec

/**
 * Encrypts KSeF token|timestamp using a public X.509 certificate downloaded
 * from the official KSeF endpoint. No private key or system token is persisted.
 */
class KsefCryptoModule : Module() {
  @Synchronized
  private fun storageKey(create: Boolean): SecretKey {
    val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    val existing = keyStore.getKey("ryczalt.invoice.storage.v1", null) as? SecretKey
    if (existing != null) return existing
    require(create) { "Invoice encryption key is unavailable." }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(KeyGenParameterSpec.Builder("ryczalt.invoice.storage.v1", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build())
    return generator.generateKey()
  }
  override fun definition() = ModuleDefinition {
    Name("RyczaltKsefCrypto")
    AsyncFunction("encryptInvoiceRecord") { plaintext: String, context: String ->
      require(plaintext.length <= 1048576 && context.length <= 512) { "Invalid storage input." }
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.ENCRYPT_MODE, storageKey(true))
      cipher.updateAAD(context.toByteArray(StandardCharsets.UTF_8))
      require(cipher.iv.size == 12) { "Invalid encryption IV." }
      val encrypted = cipher.doFinal(plaintext.toByteArray(StandardCharsets.UTF_8))
      "v1:" + Base64.encodeToString(cipher.iv + encrypted, Base64.NO_WRAP)
    }
    AsyncFunction("decryptInvoiceRecord") { payload: String, context: String ->
      require(payload.startsWith("v1:") && payload.length <= 1500000 && context.length <= 512) { "Invalid encrypted record." }
      val data = Base64.decode(payload.substring(3), Base64.NO_WRAP)
      require(data.size >= 28) { "Invalid encrypted record." }
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, storageKey(false), GCMParameterSpec(128, data.copyOfRange(0, 12)))
      cipher.updateAAD(context.toByteArray(StandardCharsets.UTF_8))
      String(cipher.doFinal(data.copyOfRange(12, data.size)), StandardCharsets.UTF_8)
    }
    AsyncFunction("encryptToken") { certificateDerBase64: String, plaintext: String ->
      require(certificateDerBase64.length in 40..32768) { "Invalid certificate." }
      require(plaintext.isNotEmpty() && plaintext.length < 8192) { "Invalid input." }
      val certificateBytes = Base64.decode(certificateDerBase64, Base64.DEFAULT)
      val certificate = CertificateFactory.getInstance("X.509")
        .generateCertificate(ByteArrayInputStream(certificateBytes)) as X509Certificate
      certificate.checkValidity()
      require(certificate.publicKey.algorithm.equals("RSA", ignoreCase = true)) {
        "KSeF public key must be RSA."
      }
      val cipher = Cipher.getInstance("RSA/ECB/OAEPPadding")
      val oaep = OAEPParameterSpec(
        "SHA-256",
        "MGF1",
        MGF1ParameterSpec.SHA256,
        PSource.PSpecified.DEFAULT
      )
      cipher.init(Cipher.ENCRYPT_MODE, certificate.publicKey, oaep)
      val ciphertext = cipher.doFinal(plaintext.toByteArray(StandardCharsets.UTF_8))
      Base64.encodeToString(ciphertext, Base64.NO_WRAP)
    }
  }
}
