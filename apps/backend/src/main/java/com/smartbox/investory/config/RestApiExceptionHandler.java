package com.smartbox.investory.config;

import com.smartbox.investory.ryczalt.application.RyczaltCounterpartyNotFoundException;
import com.smartbox.investory.ryczalt.application.RyczaltCounterpartyRuleNotFoundException;
import com.smartbox.investory.ryczalt.application.RyczaltInvoiceCandidateNotFoundException;
import com.smartbox.investory.ryczalt.application.RyczaltInvoiceConflictException;
import com.smartbox.investory.ryczalt.application.query.RyczaltPeriodNotFoundException;
import com.smartbox.investory.shared.time.ApplicationTime;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RestApiExceptionHandler {
  private final ApplicationTime applicationTime;

  public RestApiExceptionHandler(ApplicationTime applicationTime) {
    this.applicationTime = applicationTime;
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentNotValidException.class,
    MethodArgumentTypeMismatchException.class,
    ServletRequestBindingException.class,
    ConstraintViolationException.class,
    IllegalArgumentException.class
  })
  public ResponseEntity<ApiError> badRequest(Exception exception, HttpServletRequest request) {
    return error(HttpStatus.BAD_REQUEST, message(exception), request);
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ApiError> responseStatus(
      ResponseStatusException exception, HttpServletRequest request) {
    HttpStatus status = HttpStatus.resolve(exception.getStatusCode().value());
    if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;
    return error(status, status.is4xxClientError() ? message(exception) : "Internal server error", request);
  }

  @ExceptionHandler(RyczaltInvoiceConflictException.class)
  public ResponseEntity<ApiError> conflict(
      RyczaltInvoiceConflictException exception, HttpServletRequest request) {
    return error(HttpStatus.CONFLICT, message(exception), request);
  }

  @ExceptionHandler({
    RyczaltPeriodNotFoundException.class,
    RyczaltCounterpartyNotFoundException.class,
    RyczaltCounterpartyRuleNotFoundException.class,
    RyczaltInvoiceCandidateNotFoundException.class
  })
  public ResponseEntity<ApiError> notFound(RuntimeException exception, HttpServletRequest request) {
    return error(HttpStatus.NOT_FOUND, message(exception), request);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> internal(Exception exception, HttpServletRequest request) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", request);
  }

  private ResponseEntity<ApiError> error(HttpStatus status, String message, HttpServletRequest request) {
    return ResponseEntity.status(status)
        .body(new ApiError(status.value(), message, request.getRequestURI(), applicationTime.now()));
  }

  private static String message(Exception exception) {
    return exception.getMessage() == null || exception.getMessage().isBlank()
        ? "Bad request"
        : exception.getMessage();
  }

  public record ApiError(int status, String message, String path, Instant timestamp) {}
}
