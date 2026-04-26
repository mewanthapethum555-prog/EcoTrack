package lk.mewantha.ecotrack.fragments;

import android.content.Intent;
import android.net.Uri;
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

import lk.mewantha.ecotrack.DriverRouteActivity;
import lk.mewantha.ecotrack.R;

public class DriverRouteFragment extends Fragment {
    private static final String EMERGENCY_NUMBER = "0762306355";

    public DriverRouteFragment() { }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_driver_route, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        TextView tvUser = view.findViewById(R.id.tv_user);
        TextView tvRefreshed = view.findViewById(R.id.tv_refreshed);
        TextView btnOpenRoute = view.findViewById(R.id.btn_open_route);
        TextView btnEmergencyDial = view.findViewById(R.id.btn_emergency_dial);

        FirebaseUser u = FirebaseAuth.getInstance().getCurrentUser();
        tvUser.setText(u != null ? ("User: " + u.getUid()) : "User: —");
        tvRefreshed.setText("Refreshed: " + nowText());

        btnOpenRoute.setOnClickListener(v ->
                startActivity(new Intent(requireContext(), DriverRouteActivity.class))
        );

        btnEmergencyDial.setOnClickListener(v -> {
            Intent dialIntent = new Intent(Intent.ACTION_DIAL);
            dialIntent.setData(Uri.parse("tel:" + EMERGENCY_NUMBER));
            startActivity(dialIntent);
        });
    }

    private String nowText() {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date());
    }
}

