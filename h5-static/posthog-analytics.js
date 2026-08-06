(function () {
  "use strict";

  var script = document.currentScript;
  var appId = script && script.dataset.appId ? script.dataset.appId : "unknown_app";
  var appVersion = script && script.dataset.appVersion ? script.dataset.appVersion : "unknown";
  var projectToken = "phc_xHbWbzz5z6t5twJb8meE5gmP2sRgrzg7KjNynKrkVZBa";

  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init(projectToken, {
    api_host: "https://us.i.posthog.com",
    defaults: "2026-05-30",
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: true,
    person_profiles: "identified_only"
  });
  posthog.register({ app_id: appId, app_version: appVersion });

  window.QingAnalytics = {
    capture: function (eventName, properties) {
      posthog.capture(eventName, properties || {});
    }
  };

  window.QingAnalytics.capture("app_loaded", {
    page_language: document.documentElement.lang || "unknown"
  });

  var activeSeconds = 0;
  var lastActivityAt = Date.now();
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (eventName) {
    window.addEventListener(eventName, function () { lastActivityAt = Date.now(); }, { passive: true });
  });
  window.setInterval(function () {
    if (!document.hidden && Date.now() - lastActivityAt < 30000) activeSeconds += 1;
  }, 1000);
  window.addEventListener("pagehide", function () {
    window.QingAnalytics.capture("active_time_summary", { active_seconds: activeSeconds });
  });

  document.addEventListener("click", function (event) {
    var anchor = event.target.closest && event.target.closest("a[href]");
    if (!anchor) return;
    var href = anchor.getAttribute("href") || "";
    var destinationType = "";
    var destinationHost = "";
    if (href.indexOf("mailto:") === 0) {
      destinationType = "email";
    } else if (href.indexOf("http://") === 0 || href.indexOf("https://") === 0) {
      var destination = new URL(href, window.location.href);
      if (destination.origin === window.location.origin) return;
      destinationType = "external_web";
      destinationHost = destination.hostname;
    } else {
      return;
    }
    window.QingAnalytics.capture("outbound_link_clicked", {
      destination_type: destinationType,
      destination_host: destinationHost
    });
  });
}());
