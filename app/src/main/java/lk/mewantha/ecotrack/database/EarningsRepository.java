package lk.mewantha.ecotrack.database;

import java.util.ArrayList;
import java.util.List;

import lk.mewantha.ecotrack.listener.FirestoreCallback;
import lk.mewantha.ecotrack.model.Earning;

public class EarningsRepository {
    private static final String COL_EARNINGS = "earnings";

    public void listRecent(int limit, FirestoreCallback<List<Earning>> cb) {
        FirebaseDb.firestore()
                .collection(COL_EARNINGS)
                .orderBy("createdAtMillis")
                .limit(limit)
                .get()
                .addOnSuccessListener(qs -> {
                    List<Earning> list = new ArrayList<>();
                    for (com.google.firebase.firestore.DocumentSnapshot doc : qs.getDocuments()) {
                        Earning e = doc.toObject(Earning.class);
                        if (e != null) {
                            e.id = doc.getId();
                            list.add(e);
                        }
                    }
                    cb.onSuccess(list);
                })
                .addOnFailureListener(cb::onError);
    }
}

