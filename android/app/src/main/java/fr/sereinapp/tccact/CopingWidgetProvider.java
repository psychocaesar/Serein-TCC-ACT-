package fr.sereinapp.tccact;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget d'écran d'accueil affichant une carte de coping.
 * Lit les cartes directement dans le store Capacitor Preferences (SharedPreferences
 * "CapacitorStorage", clé "serein_cards") — pas besoin de pont JS côté Android.
 * Tap sur la carte -> ouvre l'app sur l'écran Cartes ; bouton ↻ -> carte suivante.
 */
public class CopingWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_NEXT = "fr.sereinapp.tccact.ACTION_NEXT_CARD";
    private static final String WIDGET_PREFS = "serein_widget";   // index courant par widget
    private static final String CAP_PREFS = "CapacitorStorage";   // store @capacitor/preferences
    private static final String CARDS_KEY = "serein_cards";
    private static final String LAST_SYNCED_KEY = "last_synced_cards";

    /**
     * Demande un rafraîchissement du widget, mais seulement si les cartes ont changé
     * depuis le dernier appel (évite un rebuild RemoteViews inutile à chaque passage
     * de l'app en arrière-plan). Appelé depuis MainActivity.onPause.
     */
    static void requestUpdateIfChanged(Context context) {
        SharedPreferences cap = context.getSharedPreferences(CAP_PREFS, Context.MODE_PRIVATE);
        String current = cap.getString(CARDS_KEY, "[]");
        SharedPreferences wp = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
        if (current.equals(wp.getString(LAST_SYNCED_KEY, null))) return; // rien n'a changé

        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(context, CopingWidgetProvider.class));
        if (ids == null || ids.length == 0) return;
        wp.edit().putString(LAST_SYNCED_KEY, current).apply();

        Intent intent = new Intent(context, CopingWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateWidget(context, mgr, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_NEXT.equals(intent.getAction())) {
            int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (id != AppWidgetManager.INVALID_APPWIDGET_ID) {
                SharedPreferences wp = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
                int idx = wp.getInt("idx_" + id, 0);
                wp.edit().putInt("idx_" + id, idx + 1).apply();
                updateWidget(context, AppWidgetManager.getInstance(context), id);
            }
        }
    }

    private void updateWidget(Context context, AppWidgetManager mgr, int id) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_coping);

        JSONArray cards = readCards(context);
        int count = (cards != null) ? cards.length() : 0;

        if (count == 0) {
            views.setTextViewText(R.id.widget_thought, "Crée ta première carte de coping dans l'app.");
            views.setViewVisibility(R.id.widget_refresh, View.GONE);
        } else {
            SharedPreferences wp = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
            int idx = wp.getInt("idx_" + id, 0);
            int pos = ((idx % count) + count) % count;   // index sûr (même si la liste a rétréci)
            String thought = "";
            try {
                JSONObject card = cards.getJSONObject(pos);
                thought = card.optString("thought", "");
            } catch (Exception e) { /* carte illisible -> texte vide */ }
            views.setTextViewText(R.id.widget_thought, "« " + thought + " »");
            views.setViewVisibility(R.id.widget_refresh, View.VISIBLE);
            views.setOnClickPendingIntent(R.id.widget_refresh, nextIntent(context, id));
        }

        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, id));
        mgr.updateAppWidget(id, views);
    }

    private JSONArray readCards(Context context) {
        try {
            SharedPreferences cap = context.getSharedPreferences(CAP_PREFS, Context.MODE_PRIVATE);
            String json = cap.getString(CARDS_KEY, null);
            if (json == null || json.isEmpty()) return null;
            return new JSONArray(json);
        } catch (Exception e) {
            return null;
        }
    }

    private int flags() {
        int f = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) f |= PendingIntent.FLAG_IMMUTABLE;
        return f;
    }

    private PendingIntent openAppIntent(Context context, int id) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("open_screen", "cards");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, id, intent, flags());
    }

    private PendingIntent nextIntent(Context context, int id) {
        Intent intent = new Intent(context, CopingWidgetProvider.class);
        intent.setAction(ACTION_NEXT);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
        // requestCode décalé pour ne pas entrer en collision avec openAppIntent
        return PendingIntent.getBroadcast(context, id + 1000000, intent, flags());
    }
}
