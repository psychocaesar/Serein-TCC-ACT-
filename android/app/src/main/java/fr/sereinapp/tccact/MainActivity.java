package fr.sereinapp.tccact;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private String pendingScreen;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getIntent() != null) pendingScreen = getIntent().getStringExtra("open_screen");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.hasExtra("open_screen")) {
            pendingScreen = intent.getStringExtra("open_screen");
            navigatePending();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        navigatePending();
    }

    /** Injecte navigateTo(screen) une fois la WebView prête (petit retry si l'app n'a pas fini de charger). */
    private void navigatePending() {
        if (pendingScreen == null || getBridge() == null || getBridge().getWebView() == null) return;
        final String screen = pendingScreen;
        pendingScreen = null;
        final String js =
            "(function go(n){if(window.navigateTo){navigateTo('" + screen + "');}" +
            "else if(n<60){setTimeout(function(){go(n+1)},100);}})(0);";
        getBridge().getWebView().post(new Runnable() {
            @Override public void run() {
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        });
    }

    @Override
    public void onPause() {
        super.onPause();
        // L'utilisateur quitte l'app -> rafraîchit le widget si les cartes ont changé.
        CopingWidgetProvider.requestUpdateIfChanged(this);
    }
}
