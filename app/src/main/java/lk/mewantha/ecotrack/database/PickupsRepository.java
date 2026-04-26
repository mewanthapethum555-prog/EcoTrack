package lk.mewantha.ecotrack.database;

import java.util.ArrayList;
import java.util.List;

import lk.mewantha.ecotrack.listener.FirestoreCallback;
import lk.mewantha.ecotrack.model.Pickup;

public class PickupsRepository {
    private static final String COL_PICKUPS = "pickups";

    public void listRecent(int limit, FirestoreCallback<List<Pickup>> cb) {
        FirebaseDb.firestore()
                .collection(COL_PICKUPS)
                .orderBy("scheduledAtMillis")
                .limit(limit)
                .get()
                .addOnSuccessListener(qs -> {
                    List<Pickup> list = new ArrayList<>();
                    for (com.google.firebase.firestore.DocumentSnapshot doc : qs.getDocuments()) {
                        Pickup p = doc.toObject(Pickup.class);
                        if (p != null) {
                            p.id = doc.getId();
                            list.add(p);
                        }
                    }
                    cb.onSuccess(list);
                })
                .addOnFailureListener(cb::onError);
    }

    public void listForUser(String userId, String status, FirestoreCallback<List<Pickup>> cb) {
        FirebaseDb.firestore()
                .collection(COL_PICKUPS)
                .whereEqualTo("userId", userId)
                .whereEqualTo("status", status)
                .get()
                .addOnSuccessListener(qs -> {
                    List<Pickup> list = new ArrayList<>();
                    for (com.google.firebase.firestore.DocumentSnapshot doc : qs.getDocuments()) {
                        Pickup p = doc.toObject(Pickup.class);
                        if (p != null) {
                            p.id = doc.getId();
                            list.add(p);
                        }
                    }
                    // Sort in memory to avoid Firestore composite index requirements.
                    list.sort((a, b) -> Long.compare(a.scheduledAtMillis, b.scheduledAtMillis));
                    cb.onSuccess(list);
                })
                .addOnFailureListener(cb::onError);
    }
}

