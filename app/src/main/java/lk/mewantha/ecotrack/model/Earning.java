package lk.mewantha.ecotrack.model;

public class Earning {
    public String id;
    public double amount;
    public long createdAtMillis;
    public String pickupId;
    /** When set, ties this earning to a driver account (Firebase Auth uid). */
    public String driverId;
    /** Legacy / alternate field name used by some writes. */
    public String userId;

    public Earning() { }
}

