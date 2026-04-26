package lk.mewantha.ecotrack;

import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import androidx.appcompat.widget.Toolbar;

import com.google.android.material.bottomnavigation.BottomNavigationView;

public class RecyclerLearnActivity extends AppCompatActivity {

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_recycler_learn);

        Toolbar toolbar = findViewById(R.id.toolbar);
        if (toolbar != null) {
            setSupportActionBar(toolbar);
            toolbar.setNavigationOnClickListener(v -> onBackPressed());
        }

        BottomNavigationView bottomNav = findViewById(R.id.recycler_bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_recycler_learn);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_recycler_home) {
                startActivity(new Intent(this, RecyclerDashboardActivity.class));
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_recycler_learn) {
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
    }
}

