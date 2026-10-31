export const CHUNK_DURATION_S = 30;
export const MIN_CHUNK_DURATION_S = 3; // early-closed/short chunks still enforce this
export const CAPTURE_MAX_MINUTES = 60;

export const FRAME_EVERY_S = 4;
export const IMAGES_CAP = 8; // max kept frames per chunk
export const PHASH_MIN_DISTANCE = 6;

export const PRE_ROLL_S = 20;
export const DEFAULT_DURATION_S = 10; // post-roll; POST_ROLL_S removed (duplicate)

export const MAX_ACTIONS = 4;

export const WAKE_LEAD_IN_S = 1;
export const COMMAND_SILENCE_S = 2;
export const COMMAND_MAX_S = 20;

export const MIN_DURATION_S = 3; // bookmark window tail (min)
export const MAX_DURATION_S = 120;

// Sweeps (plain setInterval in the server process)
export const STUCK_PROCESSING_S = 300;
export const RUN_IDLE_END_S = 600;
export const SWEEP_INTERVAL_S = 30;

// Leave-behind nudge
export const NUDGE_RADIUS_M = 200;
export const NUDGE_MIN_AGE_S = 120;
export const NUDGE_COOLDOWN_S = 600;

// Assistant identity + upload safety
export const ASSISTANT_NAME_DEFAULT = "Muse";
export const MAX_UPLOAD_MB = 25;

export const THUMB_WIDTH = 320;

// Worker ordering
export const ORDER_WAIT_S = 180; // max wait for a missing previous chunk
export const ORDER_RECHECK_S = 3; // how often a waiting chunk re-checks
