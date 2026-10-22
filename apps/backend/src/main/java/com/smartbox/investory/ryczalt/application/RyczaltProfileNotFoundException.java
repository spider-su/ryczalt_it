package com.smartbox.investory.ryczalt.application;

public class RyczaltProfileNotFoundException extends RuntimeException {
  public RyczaltProfileNotFoundException(long profileId) {
    super("Profile " + profileId + " was not found");
  }
}
