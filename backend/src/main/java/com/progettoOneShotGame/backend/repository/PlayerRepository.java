package com.progettoOneShotGame.backend.repository;

import com.progettoOneShotGame.backend.entity.PlayerEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerRepository extends JpaRepository<PlayerEntity, Long> {
}
