package com.progettoOneShotGame.backend.repository;

import com.progettoOneShotGame.backend.entity.ScoreBoardEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScoreBoardRepository extends JpaRepository<ScoreBoardEntity, Long> {
}
