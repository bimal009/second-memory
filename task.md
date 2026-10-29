Day 1 tasks, in order

Listen to rec_mono16k.wav. If it sounds normal, the audio path is confirmed.
Write services/media.py with PyAV.
Probe each file and order the segments.
Sample a frame every 2.5 s, capped at 6-8, and keep the first and last.
Drop near-duplicate frames with a lenient threshold.
Decode audio, resample to mono 16 kHz, and write a WAV.
Pick a thumbnail and save a smaller copy.
Handle photos (one frame) and no-audio files.
Close every container right away.
Wire it into process_capture.
Run media extraction on the uploaded files.
Update the capture row: file count, bytes, audio seconds, frames analyzed.
Mark the capture ready, or failed with an error message.
Delete the raw files and set raw_deleted_at.
Check the launch flow in the app. Fresh install goes to onboarding, restart goes straight in, a deleted user goes back to onboarding, and the server being offline shows Retry.
Check ngrok. /health and /me both work from the phone through the static domain.
Build the rolling buffer in the app.
Record 10-second segments, keep the last 2 minutes, and delete older ones.
Show the recording indicator and a buffer meter.
Build the trigger button.
On tap, gather the last N seconds of segments plus a few seconds after.
Add the location, and upload to /capture.
End-to-end test. Tap the button on your phone, then check that storage/ has a WAV and frames, and that the capture row is ready with correct counts.

Done when: step 8 passes.

Cut order if you run short: polish on the launch flow first, then the buffer meter. Never cut steps 2, 6, or 7.

Not today: transcription, descriptions, embeddings, the router, SAM, and reminders. Those start tomorrow.

give expected result also

Thought for 4s

Listing the steps and their expected results.

Sizing the audio clips and frame counts.

Day 1 tasks with expected results

Listen to rec_mono16k.wav.
Expected: speech sounds normal in speed and pitch, with no static or chipmunk effect.
Write services/media.py with PyAV.
Expected on a ~30 s clip: a mono 16 kHz WAV of about 30 s (roughly 1 MB), 4-8 JPEG frames, one smaller thumbnail, and all of it done in under about 3 s.
Expected on a photo: 1 frame, no WAV.
Expected on a video with no audio: frames only, no WAV, no crash.
Expected on a corrupt file: a caught error with a clear message, and the server stays up.
Expected: the first and last frames are always kept, and frame times rise steadily from near 0.
Wire it into process_capture.
Expected: the capture row goes from processing to ready.
Expected: file_count, upload_bytes, audio_seconds (close to the clip length), and frames_analyzed (4-8) are filled in.
Expected: the raw upload folder is gone and raw_deleted_at is set.
Expected: outputs sit under storage/<user>/<capture>/.
Expected on failure: status failed with a short error, and the raw files are still deleted.
Check the launch flow in the app.
Expected: a fresh install shows onboarding, and after you enter a name it saves the key and goes on to permissions, then the tabs.
Expected: a restart goes straight in with no onboarding.
Expected: after a database reset, the app returns to onboarding.
Expected: with the server off, the app shows Retry, and never creates a second user.
Check ngrok.
Expected: /health returns a success response from your phone’s browser, and /me with the saved key returns your assistant name.
Expected: the ngrok inspector at localhost:4040 shows each request with status 200.
Build the rolling buffer.
Expected: the recording indicator shows while capture is on.
Expected: a new ~10 s segment file appears about every 10 s.
Expected: after 3 minutes, only about 12 segments remain (the last 2 minutes), and older ones are deleted.
Expected: pausing stops new segments, and nothing is uploaded yet.
Build the trigger button.
Expected: one tap uploads the last N seconds of segments plus a few seconds after, with the location attached.
Expected: the server answers right away with a capture id and status processing.
Expected: polling that id shows ready within a few seconds.
Expected: a denied location permission still works, with no coordinates.
End-to-end test.
Expected: after one tap, storage/ holds a WAV and 4-8 frames, the capture row is ready with correct counts, and no raw files remain.
Expected: the whole round trip, from tap to ready, takes under about 10 s on a 30 s clip.
