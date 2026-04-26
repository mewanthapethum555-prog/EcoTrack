package lk.mewantha.ecotrack.model;

public class User {
    public String id;
    public String fullName;
    public String email;
    public String phone;
    public String address;
    public String postalCode;
    public String city;
    public String state;
    public String country;
    public String role; // "driver" | "recycler"
    public long createdAtMillis;

    public User() { }
}

