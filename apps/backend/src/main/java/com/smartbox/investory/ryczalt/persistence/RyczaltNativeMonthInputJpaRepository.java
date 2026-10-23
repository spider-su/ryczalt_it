package com.smartbox.investory.ryczalt.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RyczaltNativeMonthInputJpaRepository
    extends JpaRepository<RyczaltNativeMonthInputEntity, Long> {
  Optional<RyczaltNativeMonthInputEntity> findByProfileIdAndYearAndMonth(
      long profileId, int year, int month);

  Optional<RyczaltNativeMonthInputEntity> findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(long profileId);

  @Query(
      "select e from RyczaltNativeMonthInputEntity e where e.profileId = :profileId"
          + " and (e.year < :year or (e.year = :year and e.month < :month))"
          + " order by e.year desc, e.month desc")
  List<RyczaltNativeMonthInputEntity> findEarlier(
      @Param("profileId") long profileId,
      @Param("year") int year,
      @Param("month") int month,
      Pageable page);

  @Query(
      "select e from RyczaltNativeMonthInputEntity e where e.profileId = :profileId"
          + " and (e.year > :year or (e.year = :year and e.month > :month))"
          + " order by e.year asc, e.month asc")
  List<RyczaltNativeMonthInputEntity> findLater(
      @Param("profileId") long profileId, @Param("year") int year, @Param("month") int month);

  @Query(
      "select distinct e.profileId from RyczaltNativeMonthInputEntity e"
          + " where e.accountingStartDate is not null")
  List<Long> findConfiguredProfileIds();
}