module.exports = function extractSNI (data) {
  /*
    From https://tools.ietf.org/html/rfc5246:
    enum {
        hello_request(0), client_hello(1), server_hello(2),
        certificate(11), server_key_exchange (12),
        certificate_request(13), server_hello_done(14),
        certificate_verify(15), client_key_exchange(16),
        finished(20)
        (255)
    } HandshakeType;
    struct {
        HandshakeType msg_type;
        uint24 length;
        select (HandshakeType) {
            case hello_request:       HelloRequest;
            case client_hello:        ClientHello;
            case server_hello:        ServerHello;
            case certificate:         Certificate;
            case server_key_exchange: ServerKeyExchange;
            case certificate_request: CertificateRequest;
            case server_hello_done:   ServerHelloDone;
            case certificate_verify:  CertificateVerify;
            case client_key_exchange: ClientKeyExchange;
            case finished:            Finished;
        } body;
    } Handshake;
    struct {
        uint8 major;
        uint8 minor;
    } ProtocolVersion;
    struct {
        uint32 gmt_unix_time;
        opaque random_bytes[28];
    } Random;
    opaque SessionID<0..32>;
    uint8 CipherSuite[2];
    enum { null(0), (255) } CompressionMethod;
    struct {
        ProtocolVersion client_version;
        Random random;
        SessionID session_id;
        CipherSuite cipher_suites<2..2^16-2>;
        CompressionMethod compression_methods<1..2^8-1>;
        select (extensions_present) {
            case false:
                struct {};
            case true:
                Extension extensions<0..2^16-1>;
        };
    } ClientHello;
    */

  var end = data.length

  // skip the record header
  var pos = 5

  // skip HandshakeType (you should already have verified this)
  pos += 1

  // skip handshake length
  pos += 3

  // skip protocol version (you should already have verified this)
  pos += 2

  // skip Random
  pos += 32

  // skip SessionID
  if (pos > end - 1) return null
  var sessionIdLength = data[pos]
  pos += 1 + sessionIdLength

  // skip CipherSuite
  if (pos > end - 2) return null
  var cipherSuiteLength = data[pos] << 8 | data[pos + 1]
  pos += 2 + cipherSuiteLength

  // skip CompressionMethod
  if (pos > end - 1) return null
  var compressionMethodLength = data[pos]
  pos += 1 + compressionMethodLength

  // verify extensions exist
  if (pos > end - 2) return null
  var extensionsLength = data[pos] << 8 | data[pos + 1]
  pos += 2

  // verify the extensions fit
  var extensionsEnd = pos + extensionsLength
  if (extensionsEnd > end) return null
  end = extensionsEnd

  /*
    From https://tools.ietf.org/html/rfc5246
     and http://tools.ietf.org/html/rfc6066:
    struct {
        ExtensionType extension_type;
        opaque extension_data<0..2^16-1>;
    } Extension;
    enum {
        signature_algorithms(13), (65535)
    } ExtensionType;
    enum {
        server_name(0), max_fragment_length(1),
        client_certificate_url(2), trusted_ca_keys(3),
        truncated_hmac(4), status_request(5), (65535)
    } ExtensionType;
    struct {
        NameType name_type;
        select (name_type) {
            case host_name: HostName;
        } name;
    } ServerName;
    enum {
        host_name(0), (255)
    } NameType;
    opaque HostName<1..2^16-1>;
    struct {
        ServerName server_name_list<1..2^16-1>
    } ServerNameList;
    */

  while (pos <= end - 4) {
    var extensionType = data[pos] << 8 | data[pos + 1]
    var extensionSize = data[pos + 2] << 8 | data[pos + 3]
    pos += 4
    if (extensionType === 0) { // ExtensionType was server_name(0)
      // read ServerNameList length
      if (pos > end - 2) return null
      var nameListLength = data[pos] << 8 | data[pos + 1]
      pos += 2

      // verify we have enough bytes and loop over SeverNameList
      var n = pos
      pos += nameListLength
      if (pos > end) return null
      while (n < pos - 3) {
        var nameType = data[n]
        var nameLength = data[n + 1] << 8 | data[n + 2]
        n += 3

        // check if NameType is host_name(0)
        if (nameType === 0) {
          // verify we have enough bytes
          if (n > end - nameLength) return null

          // decode as ascii and return

          const sniName = data.toString('ascii', n, n + nameLength)
          return {
            sniName,
            start: n,
            end: n + nameLength,
            length: nameLength
          }
        } else {
          n += nameLength
        }
      }
    } else { // ExtensionType was something we are not interested in
      pos += extensionSize
    }
  }

  return null
}
