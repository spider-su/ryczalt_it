package com.smartbox.investory.config;

import com.smartbox.investory.ryczalt.application.RyczaltMonthEndReminderService;
import com.smartbox.investory.shared.time.ApplicationTime;
import java.time.YearMonth;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** On the last day of each month, reminds to issue the sales invoice and confirm calculations. */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true")
public class RyczaltMonthEndReminderScheduler {
  private final RyczaltMonthEndReminderService reminders;
  private final ApplicationTime time;

  @Scheduled(
      cron = "${app.ryczalt.month-end-reminder.cron:0 0 10 L * *}",
      zone = "${app.ryczalt.month-end-reminder.zone:Europe/Warsaw}")
  public void run() {
    reminders.remind(YearMonth.from(time.now(time.businessZone())));
  }
}
