package lk.mewantha.ecotrack.model;

public class Pickup {
    public String id;
    public String status; // scheduled | in_progress | completed | rejected
    public String address;
    public String customerName;
    public String customerPhone;
    public String type;
    public double weightKg;
    public int items;
    public double amount;
    public long scheduledAtMillis;
    public String imageUri;

    public Pickup() { }
}

