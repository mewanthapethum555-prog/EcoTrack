package lk.mewantha.ecotrack.database;

import com.google.firebase.firestore.FirebaseFirestore;

public final class FirebaseDb {
    private static FirebaseFirestore firestore;

    private FirebaseDb() {}

    public static FirebaseFirestore firestore() {
        if (firestore == null) {
            firestore = FirebaseFirestore.getInstance();
        }
        return firestore;
    }
}

