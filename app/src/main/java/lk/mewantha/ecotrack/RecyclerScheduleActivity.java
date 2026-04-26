package lk.mewantha.ecotrack;

import android.os.Bundle;
import android.view.View;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.ImageView;
import android.widget.Toast;
import com.bumptech.glide.Glide;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Locale;

import lk.mewantha.ecotrack.database.PickupsRepository;
import lk.mewantha.ecotrack.listener.FirestoreCallback;
import lk.mewantha.ecotrack.model.Pickup;

public class RecyclerScheduleActivity extends AppCompatActivity {

    private LinearLayout contentUpcoming, contentHistory;
    private TextView tvUpcoming, tvHistory;
    private View lineUpcoming, lineHistory;
    private boolean isUpcomingSelected = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_recycler_schedule);

        ImageButton btnBack = findViewById(R.id.btn_back_schedule);
        btnBack.setOnClickListener(v -> finish());

        // Tab and Content Hooks
        LinearLayout tabUpcoming = findViewById(R.id.tab_upcoming);
        LinearLayout tabHistory = findViewById(R.id.tab_history);

        tvUpcoming = findViewById(R.id.tv_upcoming);
        tvHistory = findViewById(R.id.tv_history);
        lineUpcoming = findViewById(R.id.line_upcoming);
        lineHistory = findViewById(R.id.line_history);

        contentUpcoming = findViewById(R.id.content_upcoming);
        contentHistory = findViewById(R.id.content_history);

        // Remove any hard-coded sample views from XML so the screen always shows real data.
        if (contentUpcoming != null) contentUpcoming.removeAllViews();
        if (contentHistory != null) contentHistory.removeAllViews();

        tabUpcoming.setOnClickListener(v -> switchToTab(true));
        tabHistory.setOnClickListener(v -> switchToTab(false));

        // Default: show upcoming first.
        switchToTab(true);
        loadPickups();
    }

    private void switchToTab(boolean isUpcoming) {
        isUpcomingSelected = isUpcoming;
        contentUpcoming.setVisibility(isUpcoming ? View.VISIBLE : View.GONE);
        contentHistory.setVisibility(isUpcoming ? View.GONE : View.VISIBLE);

        if (isUpcoming) {
            tvUpcoming.setTextColor(getColor(R.color.primaryColor));
            tvUpcoming.setTypeface(null, android.graphics.Typeface.BOLD);
            lineUpcoming.setBackgroundColor(getColor(R.color.primaryColor));

            tvHistory.setTextColor(getColor(R.color.grey_600));
            tvHistory.setTypeface(null, android.graphics.Typeface.NORMAL);
            lineHistory.setBackgroundColor(0);
        } else {
            tvHistory.setTextColor(getColor(R.color.primaryColor));
            tvHistory.setTypeface(null, android.graphics.Typeface.BOLD);
            lineHistory.setBackgroundColor(getColor(R.color.primaryColor));

            tvUpcoming.setTextColor(getColor(R.color.grey_600));
            tvUpcoming.setTypeface(null, android.graphics.Typeface.NORMAL);
            lineUpcoming.setBackgroundColor(0);
        }
    }

    private void loadPickups() {
        FirebaseUser current = FirebaseAuth.getInstance().getCurrentUser();
        if (current == null) {
            Toast.makeText(this, "Please login first", Toast.LENGTH_SHORT).show();
            return;
        }

        PickupsRepository repo = new PickupsRepository();

        repo.listForUser(current.getUid(), "scheduled", new FirestoreCallback<List<Pickup>>() {
            @Override
            public void onSuccess(List<Pickup> data) {
                renderUpcoming(data);
            }

            @Override
            public void onError(Exception e) {
                Toast.makeText(RecyclerScheduleActivity.this, "Failed to load upcoming pickups", Toast.LENGTH_SHORT).show();
            }
        });

        repo.listForUser(current.getUid(), "completed", new FirestoreCallback<List<Pickup>>() {
            @Override
            public void onSuccess(List<Pickup> data) {
                renderHistory(data);
            }

            @Override
            public void onError(Exception e) {
                Toast.makeText(RecyclerScheduleActivity.this, "Failed to load history", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void renderUpcoming(List<Pickup> pickups) {
        contentUpcoming.removeAllViews();
        if (pickups == null || pickups.isEmpty()) {
            if (isUpcomingSelected) contentUpcoming.setVisibility(View.VISIBLE);
            TextView tv = new TextView(this);
            tv.setText("No upcoming pickups scheduled.");
            tv.setTextColor(getColor(R.color.grey_600));
            tv.setTextSize(16);
            tv.setPadding(0, 40, 0, 0);
            contentUpcoming.addView(tv);
            return;
        }
        SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
        for (Pickup p : pickups) {
            LinearLayout itemLayout = new LinearLayout(this);
            itemLayout.setOrientation(LinearLayout.VERTICAL);
            itemLayout.setPadding(0, 16, 0, 16);

            TextView tv = new TextView(this);
            tv.setText(String.format(Locale.getDefault(), "%s • %s (%.2f kg)", p.address, fmt.format(p.scheduledAtMillis), p.weightKg));
            itemLayout.addView(tv);

            if (p.imageUri != null && !p.imageUri.isEmpty()) {
                ImageView iv = new ImageView(this);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        (int) (150 * getResources().getDisplayMetrics().density)
                );
                lp.topMargin = 8;
                iv.setLayoutParams(lp);
                iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
                itemLayout.addView(iv);
                Glide.with(this).load(p.imageUri).into(iv);
            }
            contentUpcoming.addView(itemLayout);
        }
    }

    private void renderHistory(List<Pickup> pickups) {
        contentHistory.removeAllViews();
        if (pickups == null || pickups.isEmpty()) {
            TextView tv = new TextView(this);
            tv.setText("No past pickups yet.");
            tv.setTextColor(getColor(R.color.grey_600));
            tv.setTextSize(16);
            tv.setPadding(0, 40, 0, 0);
            contentHistory.addView(tv);
            return;
        }
        SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
        for (Pickup p : pickups) {
            LinearLayout itemLayout = new LinearLayout(this);
            itemLayout.setOrientation(LinearLayout.VERTICAL);
            itemLayout.setPadding(0, 16, 0, 16);

            TextView tv = new TextView(this);
            tv.setText(String.format(Locale.getDefault(), "%s • %s (%.2f kg) - %s", p.address, fmt.format(p.scheduledAtMillis), p.weightKg, p.status));
            itemLayout.addView(tv);

            if (p.imageUri != null && !p.imageUri.isEmpty()) {
                ImageView iv = new ImageView(this);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        (int) (150 * getResources().getDisplayMetrics().density)
                );
                lp.topMargin = 8;
                iv.setLayoutParams(lp);
                iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
                itemLayout.addView(iv);
                Glide.with(this).load(p.imageUri).into(iv);
            }
            contentHistory.addView(itemLayout);
        }
    }
}
