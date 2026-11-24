package com.progettoOneShotGame.backend.repository;

import com.progettoOneShotGame.backend.entity.ActionType;
import com.progettoOneShotGame.backend.entity.ProgressEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProgressRepository extends JpaRepository<ProgressEntity, Long> {

    @Query("""
            select coalesce(sum(p.diceResult), 0)
            from ProgressEntity p
            where p.game.id = :gameId and p.actionType = :actionType
            """)
    long sumDiceResults(
            @Param("gameId") Long gameId,
            @Param("actionType") ActionType actionType);}
