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

export const NUDGE_RADIUS_M = 200;

// Worker ordering
export const ORDER_WAIT_S = 180; // max wait for a missing previous chunk
export const ORDER_RECHECK_S = 3; // how often a waiting chunk re-checks
