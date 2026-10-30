# Models

Model files are committed and served from this app's own origin. Nothing is downloaded from a CDN at runtime.

## Hand Landmarker

| Field | Value |
| --- | --- |
| File | `apps/web/public/models/hand_landmarker.task` |
| Variant | float16, version 1 |
| Source URL | https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task |
| Upstream last modified | 2023-04-26 |
| Downloaded | 2026-10-30 |
| Size | 7,819,105 bytes |
| SHA-256 | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |
| Used with | `@mediapipe/tasks-vision` 1.1.1 |

The download was also checked against the MD5 that Google Cloud Storage reports for the file (`x-goog-hash: md5=FTGEMOo4UWcP6ZFBFqnPrQ==`).

`apps/web/src/features/tracking/model.test.ts` fails if the committed file no longer matches the SHA-256 above. When replacing the model, update this table in the same commit.
