package com.smartbox.investory.ui.accounting;

import com.smartbox.investory.ui.auth.AuthenticatedRyczaltSession;
import com.smartbox.investory.ui.auth.BackendAuthException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** The only HTTP adapter behind the customer-web accounting seam. */
@Component
final class HttpRyczaltWebAccountingClient implements RyczaltWebAccountingClient {
  private static final ParameterizedTypeReference<List<JsonNode>> JSON_LIST =
      new ParameterizedTypeReference<>() {};
  private final RestClient backend;
  private final ObjectMapper json;

  HttpRyczaltWebAccountingClient(RestClient customerWebBackendRestClient, ObjectMapper json) {
    this.backend = customerWebBackendRestClient;
    this.json = json;
  }

  @Override
  public List<Month> periods(long p) {
    return list(path(p, "/periods")).stream()
        .map(n -> new Month(YearMonth.parse(text(n, "month")), text(n, "status")))
        .toList();
  }

  @Override
  public Period period(long p, YearMonth m) {
    JsonNode n = get(path(p, "/periods/{month}", m));
    return new Period(
        m,
        text(n, "status"),
        mappedList(n.path("calculations"), Calculation.class),
        mapped(n.path("summary"), Summary.class),
        mapped(n.path("audit"), Audit.class),
        mapped(n.path("documents"), DocumentsWire.class).toDocuments(),
        mapped(n.path("settlement"), SettlementWire.class).toSettlement(),
        mapped(n.path("reconciliation"), ReconciliationWire.class).toReconciliation(),
        mapped(n.path("completeness"), CompletenessWire.class).toCompleteness(),
        strings(n.path("allowedActions")));
  }

  @Override
  public List<Invoice> invoices(long p, YearMonth m) {
    return list(path(p, "/periods/{month}/invoices", m)).stream()
        .map(HttpRyczaltWebAccountingClient::invoice)
        .toList();
  }

  @Override
  public List<Transaction> transactions(long p, YearMonth m) {
    return list(path(p, "/periods/{month}/transactions", m)).stream()
        .map(
            n ->
                new Transaction(
                    number(n, "id"),
                    date(n, "bookingDate"),
                    decimal(n, "amount"),
                    text(n, "currency"),
                    text(n, "reference"),
                    text(n, "counterparty"),
                    text(n, "description"),
                    decimal(n, "matchedAmount")))
        .toList();
  }

  @Override
  public List<Obligation> obligations(long p, YearMonth m) {
    return list(path(p, "/periods/{month}/obligations", m)).stream()
        .map(HttpRyczaltWebAccountingClient::obligation)
        .toList();
  }

  @Override
  public List<ReferenceObligation> referenceObligations(long p, YearMonth m) {
    return list(path(p, "/periods/{month}/reference-obligations", m)).stream()
        .map(n -> new ReferenceObligation(text(n, "type"), decimal(n, "expected")))
        .toList();
  }

  @Override
  public List<Issue> issues(long p, YearMonth m) {
    return list(path(p, "/periods/{month}/issues", m)).stream()
        .map(
            n ->
                new Issue(
                    text(n, "id"),
                    text(n, "code"),
                    text(n, "severity"),
                    text(n, "kind"),
                    text(n, "title"),
                    text(n, "message"),
                    text(n, "sourceReference")))
        .toList();
  }

  @Override
  public List<PaymentHistory> paymentHistory(long p, YearMonth from, YearMonth to, String type) {
    var uri =
        UriComponentsBuilder.fromPath(path(p, "/payments"))
            .queryParam("from", from)
            .queryParam("to", to);
    if (type != null && !type.isBlank()) uri.queryParam("type", type);
    return list(uri.build().encode().toUriString()).stream()
        .map(
            n ->
                new PaymentHistory(
                    text(n, "type"),
                    YearMonth.parse(text(n, "period")),
                    decimal(n, "expected"),
                    decimal(n, "paid"),
                    decimal(n, "outstanding"),
                    date(n, "dueDate"),
                    date(n, "paymentDate"),
                    text(n, "status")))
        .toList();
  }

  @Override
  public List<Counterparty> counterparties(long p) {
    return list(path(p, "/counterparties")).stream()
        .map(HttpRyczaltWebAccountingClient::counterparty)
        .toList();
  }

  @Override
  public Counterparty counterparty(long p, long id) {
    return counterparty(get(path(p, "/counterparties/{id}", id)));
  }

  @Override
  public List<Invoice> invoices(long p, Long counterpartyId) {
    var uri = UriComponentsBuilder.fromPath(path(p, "/invoices"));
    if (counterpartyId != null) uri.queryParam("counterpartyId", counterpartyId);
    return list(uri.build().encode().toUriString()).stream()
        .map(HttpRyczaltWebAccountingClient::invoice)
        .toList();
  }

  @Override
  public List<Rule> rules(long p, long id) {
    return list(path(p, "/counterparties/{id}/rules", id)).stream()
        .map(
            n ->
                new Rule(
                    number(n, "id"),
                    text(n, "name"),
                    text(n, "sourceType"),
                    text(n, "documentType"),
                    text(n, "serviceKey"),
                    text(n, "classification"),
                    text(n, "vatTreatment"),
                    text(n, "vatDeductionRatio"),
                    text(n, "ryczaltRate"),
                    bool(n, "autoApprove"),
                    text(n, "paymentVerificationPolicy")))
        .toList();
  }

  @Override
  public Candidate recognize(long p, String filename, String contentType, byte[] content) {
    return candidate(
        post(
            path(p, "/invoices/recognize"),
            upload(filename, contentType, content),
            MediaType.MULTIPART_FORM_DATA));
  }

  @Override
  public Candidate candidate(long p, UUID key) {
    return candidate(get(path(p, "/invoices/candidates/{key}", key)));
  }

  @Override
  public void approveCandidate(
      long p,
      UUID key,
      Long counterpartyId,
      String classification,
      String vatTreatment,
      String vatDeductionRatio,
      String ryczaltRate,
      String paymentVerificationPolicy,
      boolean approve,
      boolean rememberRule,
      String ruleName,
      String serviceKey) {
    post(
        path(p, "/invoices"),
        nullableMap(
            "candidateKey",
            key,
            "counterpartyId",
            counterpartyId,
            "classification",
            classification,
            "vatTreatment",
            vatTreatment,
            "vatDeductionRatio",
            vatDeductionRatio,
            "ryczaltRate",
            ryczaltRate,
            "paymentVerificationPolicy",
            paymentVerificationPolicy,
            "approve",
            approve,
            "rememberRule",
            rememberRule,
            "ruleName",
            ruleName,
            "serviceKey",
            serviceKey));
  }

  @Override
  public void manualPaid(long p, long id, LocalDate paidDate, String note) {
    post(
        path(p, "/invoices/{id}/manual-paid", id),
        Map.of("paidDate", paidDate, "note", note == null ? "" : note));
  }

  @Override
  public void manualUnpaid(long p, long id) {
    delete(path(p, "/invoices/{id}/manual-paid", id));
  }

  @Override
  public void manualObligationPaid(long p, YearMonth m, long id, LocalDate paidDate, String note) {
    post(
        path(p, "/periods/{month}/obligations/{id}/manual-paid", m, id),
        Map.of("paidDate", paidDate, "note", note == null ? "" : note));
  }

  @Override
  public void manualObligationUnpaid(long p, YearMonth m, long id) {
    delete(path(p, "/periods/{month}/obligations/{id}/manual-paid", m, id));
  }

  @Override
  public void addRule(long p, long id, RuleForm rule) {
    post(path(p, "/counterparties/{id}/rules", id), ruleBody(rule));
  }

  @Override
  public void updateRule(long p, long id, long ruleId, RuleForm rule) {
    put(path(p, "/counterparties/{id}/rules/{ruleId}", id, ruleId), ruleBody(rule));
  }

  @Override
  public void deleteRule(long p, long id, long ruleId) {
    delete(path(p, "/counterparties/{id}/rules/{ruleId}", id, ruleId));
  }

  @Override
  public ImportResult importBank(long p, String filename, String contentType, byte[] content) {
    JsonNode n =
        post(
            path(p, "/bank/import"),
            upload(filename, contentType, content),
            MediaType.MULTIPART_FORM_DATA);
    return new ImportResult(
        integer(n, "received"), integer(n, "imported"), integer(n, "duplicates"), 0, 0);
  }

  @Override
  public ImportResult syncKsef(long p, YearMonth m) {
    JsonNode n = post(path(p, "/ksef/sync"), Map.of("month", m));
    return new ImportResult(
        integer(n, "received"),
        integer(n, "imported"),
        integer(n, "duplicates"),
        integer(n, "updated"),
        integer(n, "failed"));
  }

  @Override
  public void alias(long p, long id, String alias) {
    put(path(p, "/counterparties/{id}/alias", id), nullableMap("alias", alias));
  }

  @Override
  public void freeze(long p, YearMonth m, String reason) {
    post(path(p, "/periods/{month}/freeze", m), Map.of("reason", reason));
  }

  @Override
  public void reopen(long p, YearMonth m, String reason) {
    post(path(p, "/periods/{month}/reopen", m), Map.of("reason", reason));
  }

  private JsonNode get(String path) {
    return exchange(
        () ->
            backend
                .get()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .retrieve()
                .body(JsonNode.class));
  }

  private JsonNode post(String path, Object body) {
    return post(path, body, MediaType.APPLICATION_JSON);
  }

  private JsonNode post(String path, Object body, MediaType type) {
    return exchange(
        () ->
            backend
                .post()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(type)
                .body(body)
                .retrieve()
                .body(JsonNode.class));
  }

  private JsonNode put(String path, Object body) {
    return exchange(
        () ->
            backend
                .put()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class));
  }

  private void delete(String path) {
    exchange(
        () -> {
          backend
              .delete()
              .uri(path)
              .header(HttpHeaders.AUTHORIZATION, bearer())
              .retrieve()
              .toBodilessEntity();
          return null;
        });
  }

  private List<JsonNode> list(String path) {
    return exchange(
        () ->
            backend
                .get()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .retrieve()
                .body(JSON_LIST));
  }

  private String bearer() {
    return "Bearer " + session().bearerToken();
  }

  private static org.springframework.util.MultiValueMap<String, Object> upload(
      String filename, String contentType, byte[] content) {
    var headers = new HttpHeaders();
    headers.setContentType(MediaType.parseMediaType(contentType));
    headers.setContentDisposition(
        ContentDisposition.formData().name("file").filename(filename).build());
    var parts = new org.springframework.util.LinkedMultiValueMap<String, Object>();
    parts.add("file", new HttpEntity<>(new Upload(content, filename), headers));
    return parts;
  }

  private <T> T exchange(Supplier<T> call) {
    try {
      return call.get();
    } catch (RestClientResponseException ex) {
      throw new BackendAuthException(errorKind(ex.getStatusCode().value()));
    } catch (ResourceAccessException ex) {
      throw new BackendAuthException(
          isTimeout(ex)
              ? BackendAuthException.Kind.TIMEOUT
              : BackendAuthException.Kind.UNAVAILABLE);
    } catch (org.springframework.web.client.RestClientException ex) {
      throw new BackendAuthException(BackendAuthException.Kind.UNEXPECTED);
    }
  }

  private static boolean isTimeout(Throwable error) {
    for (Throwable cause = error; cause != null; cause = cause.getCause())
      if (cause instanceof java.net.SocketTimeoutException
          || cause instanceof java.net.http.HttpTimeoutException) return true;
    return false;
  }

  private AuthenticatedRyczaltSession session() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null
        || !(authentication.getPrincipal() instanceof AuthenticatedRyczaltSession s))
      throw new BackendAuthException(BackendAuthException.Kind.UNAUTHENTICATED);
    return s;
  }

  private static BackendAuthException.Kind errorKind(int status) {
    return switch (status) {
      case 401 -> BackendAuthException.Kind.UNAUTHENTICATED;
      case 403 -> BackendAuthException.Kind.FORBIDDEN;
      case 404 -> BackendAuthException.Kind.NOT_FOUND;
      case 400, 422 -> BackendAuthException.Kind.VALIDATION;
      case 409 -> BackendAuthException.Kind.CONFLICT;
      case 408, 504 -> BackendAuthException.Kind.TIMEOUT;
      case 502, 503 -> BackendAuthException.Kind.UNAVAILABLE;
      default -> BackendAuthException.Kind.UNEXPECTED;
    };
  }

  private String path(long p, String suffix, Object... vars) {
    String value = "/api/profiles/" + p + "/accounting" + suffix;
    var matcher = java.util.regex.Pattern.compile("\\{[^}]+\\}").matcher(value);
    var out = new StringBuffer();
    int index = 0;
    while (matcher.find()) {
      if (index >= vars.length) throw new IllegalArgumentException("Missing endpoint path value");
      matcher.appendReplacement(
          out,
          java.util.regex.Matcher.quoteReplacement(
              java.net.URLEncoder.encode(
                  String.valueOf(vars[index++]), java.nio.charset.StandardCharsets.UTF_8)));
    }
    matcher.appendTail(out);
    if (index != vars.length) throw new IllegalArgumentException("Unexpected endpoint path value");
    return out.toString();
  }

  private <T> T mapped(JsonNode node, Class<T> type) {
    return json.convertValue(node, type);
  }

  private <T> List<T> mappedList(JsonNode node, Class<T> type) {
    var values = new java.util.ArrayList<T>();
    node.forEach(item -> values.add(mapped(item, type)));
    return List.copyOf(values);
  }

  private static String text(JsonNode n, String k) {
    return n.path(k).isMissingNode() || n.path(k).isNull() ? null : n.path(k).asText();
  }

  private static long number(JsonNode n, String k) {
    return n.path(k).asLong();
  }

  private static int integer(JsonNode n, String k) {
    return n.path(k).asInt();
  }

  private static boolean bool(JsonNode n, String k) {
    return n.path(k).asBoolean();
  }

  private static LocalDate date(JsonNode n, String k) {
    String v = text(n, k);
    return v == null ? null : LocalDate.parse(v);
  }

  private static BigDecimal decimal(JsonNode n, String k) {
    String v = text(n, k);
    return v == null ? null : new BigDecimal(v);
  }

  private static List<String> strings(JsonNode n) {
    var out = new java.util.ArrayList<String>();
    n.forEach(v -> out.add(v.asText()));
    return List.copyOf(out);
  }

  private static Invoice invoice(JsonNode n) {
    JsonNode c = n.path("counterparty");
    return new Invoice(
        number(n, "id"),
        text(n, "direction"),
        text(n, "reference"),
        date(n, "issueDate"),
        date(n, "accountingDate"),
        decimal(n, "netAmount"),
        decimal(n, "vatAmount"),
        decimal(n, "grossAmount"),
        text(n, "currency"),
        text(n, "approvalStatus"),
        text(n, "approvalMethod"),
        text(n, "paymentVerificationPolicy"),
        text(n, "paymentStatus"),
        firstNonBlank(text(c, "alias"), text(c, "legalName")));
  }

  private static String firstNonBlank(String preferred, String fallback) {
    return preferred == null || preferred.isBlank() ? fallback : preferred;
  }

  private static Obligation obligation(JsonNode n) {
    return new Obligation(
        number(n, "id"),
        text(n, "type"),
        decimal(n, "expected"),
        decimal(n, "paid"),
        decimal(n, "outstanding"),
        text(n, "currency"),
        date(n, "dueDate"),
        text(n, "status"),
        bool(n, "manuallyPaid"),
        date(n, "manualPaidDate"));
  }

  private static Counterparty counterparty(JsonNode n) {
    return new Counterparty(
        number(n, "id"),
        text(n, "legalName"),
        text(n, "alias"),
        text(n, "displayName"),
        text(n, "taxIdentifier"),
        text(n, "country"),
        text(n, "bankAccount"),
        number(n, "ruleCount"),
        number(n, "invoiceCount"));
  }

  private Candidate candidate(JsonNode n) {
    var required = new java.util.ArrayList<String>();
    n.path("requiredInputs").forEach(i -> required.add(text(i, "field")));
    return new Candidate(
        UUID.fromString(text(n, "candidateKey")),
        text(n, "sourceType"),
        text(n, "documentType"),
        text(n, "direction"),
        date(n, "issueDate"),
        date(n, "saleDate"),
        date(n, "dueDate"),
        text(n, "reference"),
        n.path("counterpartyId").isNull() ? null : number(n, "counterpartyId"),
        text(n, "currency"),
        text(n, "netAmount"),
        text(n, "vatAmount"),
        text(n, "grossAmount"),
        text(n, "classification"),
        text(n, "vatTreatment"),
        text(n, "ryczaltRate"),
        text(n, "approvalStatus"),
        text(n, "approvalMethod"),
        text(n, "paymentVerificationPolicy"),
        text(n, "ruleMatchStatus"),
        text(n, "paymentStatus"),
        text(n, "sourceState"),
        integer(n, "periodYear"),
        integer(n, "periodMonth"),
        required);
  }

  private static Map<String, Object> ruleBody(RuleForm r) {
    return nullableMap(
        "name",
        r.name(),
        "sourceType",
        r.sourceType(),
        "documentType",
        r.documentType(),
        "serviceKey",
        r.serviceKey(),
        "classification",
        r.classification(),
        "vatTreatment",
        r.vatTreatment(),
        "vatDeductionRatio",
        r.vatDeductionRatio(),
        "ryczaltRate",
        r.ryczaltRate(),
        "autoApprove",
        r.autoApprove(),
        "paymentVerificationPolicy",
        r.paymentVerificationPolicy());
  }

  private static Map<String, Object> nullableMap(Object... pairs) {
    var m = new java.util.LinkedHashMap<String, Object>();
    for (int i = 0; i < pairs.length; i += 2)
      if (pairs[i + 1] != null) m.put((String) pairs[i], pairs[i + 1]);
    return m;
  }

  private record Upload(byte[] bytes, String filename)
      implements org.springframework.core.io.Resource {
    @Override
    public boolean exists() {
      return true;
    }

    @Override
    public boolean isReadable() {
      return true;
    }

    @Override
    public boolean isOpen() {
      return true;
    }

    @Override
    public java.net.URL getURL() {
      throw new UnsupportedOperationException();
    }

    @Override
    public java.net.URI getURI() {
      throw new UnsupportedOperationException();
    }

    @Override
    public java.io.File getFile() {
      throw new UnsupportedOperationException();
    }

    @Override
    public long contentLength() {
      return bytes.length;
    }

    @Override
    public long lastModified() {
      return 0;
    }

    @Override
    public org.springframework.core.io.Resource createRelative(String p) {
      throw new UnsupportedOperationException();
    }

    @Override
    public String getFilename() {
      return filename;
    }

    @Override
    public String getDescription() {
      return "uploaded file";
    }

    @Override
    public java.io.InputStream getInputStream() {
      return new java.io.ByteArrayInputStream(bytes);
    }
  }

  private record DocumentsWire(int invoiceCount, int transactionCount) {
    Documents toDocuments() {
      return new Documents(invoiceCount, transactionCount);
    }
  }

  private record SettlementWire(
      int expectedCount,
      int paidCount,
      int outstandingCount,
      BigDecimal totalExpected,
      BigDecimal totalPaid,
      BigDecimal totalOutstanding,
      boolean fullySettled) {
    Settlement toSettlement() {
      return new Settlement(
          expectedCount,
          paidCount,
          outstandingCount,
          totalExpected,
          totalPaid,
          totalOutstanding,
          fullySettled);
    }
  }

  private record ReconciliationWire(
      int rowCount, int settledCount, int mismatchCount, int missingEvidenceCount) {
    Reconciliation toReconciliation() {
      return new Reconciliation(rowCount, settledCount, mismatchCount, missingEvidenceCount);
    }
  }

  private record CompletenessWire(String status, int blockingIssueCount) {
    Completeness toCompleteness() {
      return new Completeness(status, blockingIssueCount);
    }
  }
}
