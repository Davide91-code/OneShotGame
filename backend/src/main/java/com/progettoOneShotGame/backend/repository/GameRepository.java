package com.progettoOneShotGame.backend.repository;

import com.progettoOneShotGame.backend.entity.GameEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRepository extends JpaRepository<GameEntity, Long> {
}
