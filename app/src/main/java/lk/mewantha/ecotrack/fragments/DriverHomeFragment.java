package lk.mewantha.ecotrack.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import lk.mewantha.ecotrack.DriverDashboardActivity;
import lk.mewantha.ecotrack.R;

public class DriverHomeFragment extends Fragment {

    public DriverHomeFragment() { }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_driver_home, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        TextView tvUser = view.findViewById(R.id.tv_user);
        TextView tvRefreshed = view.findViewById(R.id.tv_refreshed);
        TextView btnRefresh = view.findViewById(R.id.btn_refresh);
        TextView btnOpenDashboard = view.findViewById(R.id.btn_open_dashboard);

        Runnable refresh = () -> {
            FirebaseUser u = FirebaseAuth.getInstance().getCurrentUser();
            tvUser.setText(u != null ? ("User: " + u.getUid()) : "User: —");
            tvRefreshed.setText("Refreshed: " + nowText());
        };

        refresh.run();

        btnRefresh.setOnClickListener(v -> refresh.run());
        btnOpenDashboard.setOnClickListener(v -> startActivity(new Intent(requireContext(), DriverDashboardActivity.class)));
    }

    private String nowText() {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date());
    }
}

