package lk.mewantha.ecotrack;

import android.content.Intent;
import android.os.Bundle;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.widget.Toolbar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.widget.NestedScrollView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.FirebaseUserMetadata;
import com.google.firebase.firestore.FirebaseFirestore;

import java.util.HashMap;
import java.util.Map;

import lk.mewantha.ecotrack.database.UsersRepository;
import lk.mewantha.ecotrack.listener.FirestoreCallback;
import lk.mewantha.ecotrack.model.User;

public class RecyclerProfileActivity extends AppCompatActivity {

    private BottomNavigationView bottomNav;
    private boolean isEditing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_recycler_profile);

        // Back arrow (toolbar navigation icon)
        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> onBackPressed());

        // Setup bottom navigation
        bottomNav = findViewById(R.id.recycler_bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_recycler_profile);

        bottomNav.setOnItemSelectedListener(item -> {
            int itemId = item.getItemId();
            if (itemId == R.id.nav_recycler_home) {
                startActivity(new Intent(RecyclerProfileActivity.this, RecyclerDashboardActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            } else if (itemId == R.id.nav_recycler_learn) {
                startActivity(new Intent(RecyclerProfileActivity.this, RecyclerLearnActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            } else if (itemId == R.id.nav_recycler_submit) {
                startActivity(new Intent(RecyclerProfileActivity.this, RecyclerSubmitActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            } else if (itemId == R.id.nav_recycler_profile) {
                return true;
            }
            return false;
        });

        adjustScrollPaddingForBottomNav();
        loadProfile();

        ImageView ivEdit = findViewById(R.id.ivEditProfile);
        ivEdit.setOnClickListener(v -> toggleEditAndSave());

        findViewById(R.id.btnLogout).setOnClickListener(v -> {
            FirebaseAuth.getInstance().signOut();
            Toast.makeText(this, "Logged out", Toast.LENGTH_SHORT).show();
            startActivity(new Intent(RecyclerProfileActivity.this, ChooseRoleActivity.class));
            finishAffinity();
        });
    }

    private void adjustScrollPaddingForBottomNav() {
        NestedScrollView scrollView = findViewById(R.id.scroll_profile);
        if (scrollView == null || bottomNav == null) return;

        // Wait until layout is measured so we can use the real bottom navigation height.
        scrollView.post(() -> {
            int navHeight = bottomNav.getHeight();
            int extraPx = Math.round(16 * getResources().getDisplayMetrics().density);

            // Also account for the system navigation bar inset (safe area),
            // otherwise some devices still overlap content.
            ViewCompat.setOnApplyWindowInsetsListener(scrollView, (v, insets) -> {
                int navBarBottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
                int desiredPaddingBottom = navHeight + extraPx + navBarBottom;
                v.setPadding(
                        v.getPaddingLeft(),
                        v.getPaddingTop(),
                        v.getPaddingRight(),
                        desiredPaddingBottom
                );
                return insets;
            });

            // Trigger insets pass now.
            ViewCompat.requestApplyInsets(scrollView);
        });
    }

    private void loadProfile() {
        FirebaseUser current = FirebaseAuth.getInstance().getCurrentUser();
        if (current == null) {
            Toast.makeText(this, "Please login first", Toast.LENGTH_SHORT).show();
            return;
        }

        TextView tvHeaderName = findViewById(R.id.tvProfileNameHeader);
        TextView tvHeaderEmail = findViewById(R.id.tvProfileEmailHeader);
        TextView etFullName = findViewById(R.id.tvProfileFullName);
        TextView etEmail = findViewById(R.id.tvProfileEmail);
        TextView etPhone = findViewById(R.id.tvProfilePhone);
        TextView etStreet = findViewById(R.id.tvProfileStreet);
        TextView etCity = findViewById(R.id.tvProfileCity);
        TextView etState = findViewById(R.id.tvProfileState);
        TextView etPostal = findViewById(R.id.tvProfilePostal);
        TextView tvMemberSince = findViewById(R.id.tvProfileMemberSince);

        new UsersRepository().getUserById(current.getUid(), new FirestoreCallback<User>() {
            @Override
            public void onSuccess(User data) {
                if (data == null) return;
                if (data.fullName != null) {
                    tvHeaderName.setText(data.fullName);
                    etFullName.setText(data.fullName);
                }
                if (data.email != null) {
                    tvHeaderEmail.setText(data.email);
                    etEmail.setText(data.email);
                }
                if (data.phone != null) {
                    etPhone.setText(data.phone);
                }
                if (data.address != null) {
                    etStreet.setText(data.address);
                }
                // city/state/postal not yet stored separately; leave placeholders or use address
                if (data.city != null && !data.city.isEmpty()) {
                    etCity.setText(data.city);
                }
                if (data.state != null && !data.state.isEmpty()) {
                    etState.setText(data.state);
                }
                if (data.postalCode != null && !data.postalCode.isEmpty()) {
                    etPostal.setText(data.postalCode);
                }
                if (data.createdAtMillis > 0) {
                    java.text.SimpleDateFormat fmt = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault());
                    tvMemberSince.setText(fmt.format(new java.util.Date(data.createdAtMillis)));
                } else {
                    FirebaseUserMetadata meta = current.getMetadata();
                    if (meta != null) {
                        long created = meta.getCreationTimestamp();
                        if (created > 0) {
                            java.text.SimpleDateFormat fmt = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault());
                            tvMemberSince.setText(fmt.format(new java.util.Date(created)));

                            // Backfill Firestore so it stays consistent
                            FirebaseFirestore.getInstance()
                                    .collection("users")
                                    .document(current.getUid())
                                    .update("createdAtMillis", created);
                        }
                    }
                }
            }

            @Override
            public void onError(Exception e) {
                Toast.makeText(RecyclerProfileActivity.this, "Failed to load profile", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setEditable(boolean enabled) {
        TextView etFullName = findViewById(R.id.tvProfileFullName);
        TextView etPhone = findViewById(R.id.tvProfilePhone);
        TextView etStreet = findViewById(R.id.tvProfileStreet);
        TextView etCity = findViewById(R.id.tvProfileCity);
        TextView etState = findViewById(R.id.tvProfileState);
        TextView etPostal = findViewById(R.id.tvProfilePostal);

        etFullName.setEnabled(enabled);
        etPhone.setEnabled(enabled);
        etStreet.setEnabled(enabled);
        etCity.setEnabled(enabled);
        etState.setEnabled(enabled);
        etPostal.setEnabled(enabled);
    }

    private void toggleEditAndSave() {
        FirebaseUser current = FirebaseAuth.getInstance().getCurrentUser();
        if (current == null) {
            Toast.makeText(this, "Please login first", Toast.LENGTH_SHORT).show();
            return;
        }

        ImageView ivEdit = findViewById(R.id.ivEditProfile);

        if (!isEditing) {
            // Enter edit mode
            setEditable(true);
            ivEdit.setImageResource(android.R.drawable.ic_menu_save);
            isEditing = true;
        } else {
            // Save changes
            TextView etFullName = findViewById(R.id.tvProfileFullName);
            TextView etPhone = findViewById(R.id.tvProfilePhone);
            TextView etStreet = findViewById(R.id.tvProfileStreet);
            TextView etCity = findViewById(R.id.tvProfileCity);
            TextView etState = findViewById(R.id.tvProfileState);
            TextView etPostal = findViewById(R.id.tvProfilePostal);

            String name = etFullName.getText().toString().trim();
            String phone = etPhone.getText().toString().trim();
            String address = etStreet.getText().toString().trim();
            String city = etCity.getText().toString().trim();
            String state = etState.getText().toString().trim();
            String postal = etPostal.getText().toString().trim();

            Map<String, Object> updates = new HashMap<>();
            updates.put("fullName", name);
            updates.put("phone", phone);
            updates.put("address", address);
            updates.put("city", city);
            updates.put("state", state);
            updates.put("postalCode", postal);

            FirebaseFirestore.getInstance()
                    .collection("users")
                    .document(current.getUid())
                    .update(updates)
                    .addOnSuccessListener(unused -> {
                        Toast.makeText(this, "Profile updated", Toast.LENGTH_SHORT).show();
                        setEditable(false);
                        ivEdit.setImageResource(android.R.drawable.ic_menu_edit);
                        isEditing = false;
                    })
                    .addOnFailureListener(e -> Toast.makeText(this, "Failed to update: " + e.getMessage(), Toast.LENGTH_SHORT).show());
        }
    }
}
