package lk.mewantha.ecotrack.database;

import androidx.annotation.Nullable;

import com.google.firebase.firestore.DocumentSnapshot;

import lk.mewantha.ecotrack.listener.FirestoreCallback;
import lk.mewantha.ecotrack.model.User;

public class UsersRepository {
    private static final String COL_USERS = "users";

    public void getUserById(String userId, FirestoreCallback<User> cb) {
        FirebaseDb.firestore()
                .collection(COL_USERS)
                .document(userId)
                .get()
                .addOnSuccessListener(doc -> cb.onSuccess(toUser(doc)))
                .addOnFailureListener(cb::onError);
    }

    private @Nullable User toUser(DocumentSnapshot doc) {
        if (doc == null || !doc.exists()) return null;
        User u = doc.toObject(User.class);
        if (u != null) u.id = doc.getId();
        return u;
    }
}

