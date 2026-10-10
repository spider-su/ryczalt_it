package com.smartbox.investory.integrations.management.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IntegrationJobRepository extends JpaRepository<IntegrationJobEntity, Long> {
  List<IntegrationJobEntity> findByEnabledTrueAndJobType(String jobType);

  Optional<IntegrationJobEntity> findByIntegrationInstanceIdAndJobType(Long instanceId, String jobType);
}
