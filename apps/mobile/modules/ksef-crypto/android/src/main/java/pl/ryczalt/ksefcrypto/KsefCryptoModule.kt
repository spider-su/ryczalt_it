package pl.ryczalt.ksefcrypto

import android.util.Base64
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
  override fun definition() = ModuleDefinition {
    Name("RyczaltKsefCrypto")
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
