package org.elam.library;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import java.io.IOException;

public class MainActivity extends Activity {
    private WebView web;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setOnApplyWindowInsetsListener(new android.view.View.OnApplyWindowInsetsListener() {
            @Override public android.view.WindowInsets onApplyWindowInsets(android.view.View view, android.view.WindowInsets insets) {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
                return insets;
            }
        });
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setAllowFileAccess(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"appassets.androidplatform.net".equals(uri.getHost())) return null;
                String path = uri.getPath();
                if (path == null || path.equals("/")) path = "/index.html";
                if (path.contains("..") || path.contains("\\") || !path.matches("/[a-zA-Z0-9_./-]+")) return missing();
                String mime = path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "application/javascript" :
                        path.endsWith(".css") ? "text/css" : path.endsWith(".json") ? "application/json" :
                        path.endsWith(".md") ? "text/markdown" : path.endsWith(".png") ? "image/png" :
                        path.endsWith(".webp") ? "image/webp" : path.endsWith(".jpg") || path.endsWith(".jpeg") ? "image/jpeg" : "application/octet-stream";
                try { return new WebResourceResponse(mime, "UTF-8", getAssets().open("public" + path)); }
                catch (IOException e) { return missing(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
            }
        });
        setContentView(web);
        openLaunch(getIntent());
    }
    private WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0]));
    }
    private void openLaunch(Intent intent) {
        Uri data = intent.getData();
        String route = data != null && "elamlibrary".equals(data.getScheme()) && "read".equals(data.getHost()) ? "/read/" + data.getLastPathSegment() : "/";
        web.loadUrl("https://appassets.androidplatform.net/index.html#" + route);
    }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); openLaunch(intent); }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            web.evaluateJavascript("document.dispatchEvent(new Event('visibilitychange'));", null);
        }
    }
    @Override protected void onPause() { if (web != null) web.onPause(); super.onPause(); }
    private boolean handleNavigation(Uri uri) {
        if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())) return false;
        if ("https".equals(uri.getScheme())) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
            catch (android.content.ActivityNotFoundException ignored) { }
        }
        return true;
    }
    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
