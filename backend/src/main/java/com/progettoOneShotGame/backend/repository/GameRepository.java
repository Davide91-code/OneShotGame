package com.progettoOneShotGame.backend.repository;

import com.progettoOneShotGame.backend.entity.GameEntity;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRepository extends JpaRepository<GameEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from GameEntity g where g.id = :gameId")
    Optional<GameEntity> findByIdForUpdate(@Param("gameId") Long gameId);
}