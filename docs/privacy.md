# Privacy

## What stays in the browser

- Camera video is processed only in the user's browser. It is never uploaded, recorded, screenshotted, logged or stored.
- Hand tracking (MediaPipe Hand Landmarker) runs in the browser. Landmarks are never sent anywhere, logged or stored.
- The model (`/models/hand_landmarker.task`) and the MediaPipe WASM runtime (`/mediapipe/wasm/`) are served from the app's own origin. Nothing is loaded from a CDN or Google domain at runtime.
- The camera is requested only after the user presses a button, and every track is stopped on Stop, page leave and unmount.

## MediaPipe usage metrics

`@mediapipe/tasks-vision` 1.x tries to send performance and usage metrics to Google (`https://odml.pa.googleapis.com/v1/log`, flushed about once a minute). The package README says:

> MediaPipe Tasks APIs send metrics about the performance and utilization of the APIs in your app to Google. […] You are responsible for obtaining informed consent from your app users about Google's processing of MediaPipe metrics data as required by applicable law.

(`node_modules/@mediapipe/tasks-vision/README.md`, "Privacy Notice", last modified June 5, 2026.) The README also says input data such as images and video is processed on device and not sent to Google. Version 1.1.1 has no option to turn the metrics off.

## How it is blocked

`apps/web/next.config.ts` sends this header on every route:

```
Content-Security-Policy: connect-src 'self'
```

The browser therefore refuses `fetch`, XHR, WebSocket and beacon requests to any other origin, including the metrics request. The browser console shows one CSP violation for it; tracking is unaffected. `apps/web/src/next-config.test.ts` fails if this directive or the `Permissions-Policy` header is changed.

**Do not loosen the CSP (for example to add an API origin or analytics) without reviewing this note.** Any origin added to `connect-src` could also receive the MediaPipe metrics, or other data, so check what each new origin can receive and whether user consent is needed. Re-check the package README whenever `@mediapipe/tasks-vision` is upgraded.
