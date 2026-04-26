package lk.mewantha.ecotrack;

import android.content.Intent;
import android.os.Bundle;
import android.net.Uri;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import lk.mewantha.ecotrack.database.EarningsRepository;
import lk.mewantha.ecotrack.database.UsersRepository;
import lk.mewantha.ecotrack.listener.FirestoreCallback;
import lk.mewantha.ecotrack.model.Earning;
import lk.mewantha.ecotrack.model.User;

import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Locale;

public class RecyclerDashboardActivity extends AppCompatActivity {
    private static final String EMERGENCY_NUMBER = "0762306355";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_recycler_dashboard);

        BottomNavigationView bottomNav = findViewById(R.id.recycler_bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_recycler_home);

        // Grid Tile Clicks
        findViewById(R.id.tile_learn).setOnClickListener(v -> {
            startActivity(new Intent(RecyclerDashboardActivity.this, RecyclerLearnActivity.class));
        });

        findViewById(R.id.tile_submit).setOnClickListener(v -> {
            startActivity(new Intent(RecyclerDashboardActivity.this, RecyclerSubmitActivity.class));
        });

        findViewById(R.id.tile_profile).setOnClickListener(v -> {
            startActivity(new Intent(RecyclerDashboardActivity.this, RecyclerProfileActivity.class));
        });

        findViewById(R.id.tile_schedule).setOnClickListener(v -> {
            startActivity(new Intent(RecyclerDashboardActivity.this, RecyclerScheduleActivity.class));
        });

        findViewById(R.id.tile_track).setOnClickListener(v -> {
            startActivity(new Intent(RecyclerDashboardActivity.this, RecyclerTrackActivity.class));
        });

        findViewById(R.id.tile_payments).setOnClickListener(v -> {
            startActivity(new Intent(RecyclerDashboardActivity.this, RecyclerPaymentsActivity.class));
        });

        // Emergency dial
        TextView btnEmergencyDial = findViewById(R.id.btnEmergencyDial);
        TextView tvEmergencyNumber = findViewById(R.id.tvEmergencyNumber);
        if (tvEmergencyNumber != null) tvEmergencyNumber.setText(EMERGENCY_NUMBER);
        if (btnEmergencyDial != null) {
            btnEmergencyDial.setOnClickListener(v -> {
                Intent dialIntent = new Intent(Intent.ACTION_DIAL);
                dialIntent.setData(Uri.parse("tel:" + EMERGENCY_NUMBER));
                startActivity(dialIntent);
            });
        }
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_recycler_home) {
                return true;
            } else if (id == R.id.nav_recycler_learn) {
                startActivity(new Intent(this, RecyclerLearnActivity.class));
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_recycler_submit) {
                startActivity(new Intent(this, RecyclerSubmitActivity.class));
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_recycler_profile) {
                startActivity(new Intent(this, RecyclerProfileActivity.class));
                overridePendingTransition(0, 0);
                return true;
            }
            return false;
        });

        loadUserHeader();
        loadRecentEarnings();
    }

    private void loadUserHeader() {
        FirebaseUser current = FirebaseAuth.getInstance().getCurrentUser();
        if (current == null) return;

        TextView tvGreeting = findViewById(R.id.tvRecyclerGreeting);

        new UsersRepository().getUserById(current.getUid(), new FirestoreCallback<User>() {
            @Override
            public void onSuccess(User data) {
                if (data == null) return;
                if (data.fullName != null && !data.fullName.isEmpty()) {
                    tvGreeting.setText("Hi, " + data.fullName);
                }
            }

            @Override
            public void onError(Exception e) {
                Toast.makeText(RecyclerDashboardActivity.this, "Failed to load profile", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void loadRecentEarnings() {
        TextView tvRecentAmount = findViewById(R.id.tvRecyclerRecentAmount);
        TextView tvRecentTime = findViewById(R.id.tvRecyclerRecentTime);

        new EarningsRepository().listRecent(1, new FirestoreCallback<List<Earning>>() {
            @Override
            public void onSuccess(List<Earning> data) {
                if (data == null || data.isEmpty()) return;
                Earning e = data.get(0);
                tvRecentAmount.setText(String.format(Locale.getDefault(), "LKR %.2f", e.amount));
                SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
                tvRecentTime.setText(fmt.format(e.createdAtMillis));
            }

            @Override
            public void onError(Exception e) {
                // silent for now
            }
        });
    }
}
