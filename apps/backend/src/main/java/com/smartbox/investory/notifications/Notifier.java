package com.smartbox.investory.notifications;

import java.util.LinkedHashSet;
import java.util.Set;

/** Delivers user-facing notifications. Delivery failures never propagate to the caller. */
public interface Notifier {
  /**
   * Sends a message about one profile. Inside a transaction the message is sent only after a
   * successful commit, so rolled-back work is never announced.
   */
  void notifyProfile(long profileId, String text);

  /** Sends an operational alert (e.g. an integration job failed), regardless of profile. */
  void notifyOperators(String text);

  /** Compact, de-duplicated cause chain for alert messages. */
  static String describe(Throwable failure) {
    Set<String> messages = new LinkedHashSet<>();
    for (Throwable t = failure; t != null && messages.size() < 4; t = t.getCause()) {
      messages.add(t.getMessage() == null ? t.getClass().getSimpleName() : t.getMessage());
    }
    String text = String.join(" ← ", messages);
    return text.length() > 600 ? text.substring(0, 599) + "…" : text;
  }
}
