package lk.mewantha.ecotrack.listener;

public interface FirestoreCallback<T> {
    void onSuccess(T data);
    void onError(Exception e);
}

