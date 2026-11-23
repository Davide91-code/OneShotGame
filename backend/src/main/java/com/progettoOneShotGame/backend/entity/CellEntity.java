package com.progettoOneShotGame.backend.entity;


public class CellEntity {
   

    private int positiveOutcomeHpChange;
    private int negativeOutcomeHpChange;
    private Long id;
    private String eventDescription;
    private String positiveOutcomeDescription;
    private String negativeOutcomeDescription;
    
  

            public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }


     public String getEventDescription() {
    return eventDescription;
}

public void setEventDescription(String eventDescription) {
    this.eventDescription = eventDescription;
}


public String getPositiveOutcomeDescription() {
    return positiveOutcomeDescription;
}

public void setPositiveOutcomeDescription(String positiveOutcomeDescription) {
    this.positiveOutcomeDescription = positiveOutcomeDescription;
}

public String getNegativeOutcomeDescription() {
    return negativeOutcomeDescription;
}

public void setNegativeOutcomeDescription(String negativeOutcomeDescription) {
    this.negativeOutcomeDescription = negativeOutcomeDescription;
}






}
















































}
