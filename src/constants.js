// ============================================================
// Track
// ============================================================
export const TRACK_WIDTH = 1.4;             // meters (flat floor, wall to wall at base)
export const TRACK_WALL_HEIGHT_MIN = 1.5;   // meters (wall height on straights)
export const TRACK_WALL_HEIGHT_MAX = 5.5;   // meters (wall height on tight banked turns)
export const TRACK_WALL_RADIUS = 2.5;       // meters (max curve radius of wall arc)
export const TRACK_SEGMENTS = 600;          // number of cross-sections along spline
export const TRACK_PROFILE_SEGMENTS = 24;   // vertices per cross-section side

// ============================================================
// Physics
// ============================================================
export const GRAVITY = 9.81;
export const ICE_FRICTION = 0.03;
export const AIR_DRAG = 0.0008;
export const STEERING_ACCEL = 2.0;          // lateral m/s^2 from input (reduced for narrower track)
export const LATERAL_DAMPING = 5.0;         // lateral friction (tighter for narrower track)
export const WALL_HIT_SPEED_PENALTY = 0.92; // multiply speed on wall hit
export const WALL_BOUNCE = 0.3;             // lateral velocity restitution
export const STEERING_SCRUB = 0.15;         // speed cost of lateral movement
export const BANKING_SCALE = 8.0;           // scales ideal banking offset
export const BANKING_SPEED_BONUS = 0.3;     // m/s^2 bonus for optimal line
export const BANKING_PENALTY = 0.5;         // m/s^2 penalty for wrong line
export const BANKING_RESTORE = 3.0;         // lateral restoring force on banks
export const MAX_LATERAL_OFFSET = 1.0;      // normalized track half-width

// ============================================================
// Push Start
// ============================================================
export const PUSH_DISTANCE = 50;            // meters
export const PUSH_OPTIMAL_BPS = 8;          // mashes per second target
export const PUSH_MAX_SPEED = 11.1;         // m/s (~40 km/h)
export const PUSH_MIN_SPEED = 6.9;          // m/s (~25 km/h)
export const PUSH_SPEED_INCREMENT = 0.35;   // m/s per good press
export const PUSH_ACCELERATION = 2.0;       // m/s^2 base push accel

// ============================================================
// Camera
// ============================================================
export const CAMERA_OFFSET_RACING = [0, 2.5, -6];  // -Z = behind sled (sled's +Z faces forward)
export const CAMERA_OFFSET_PUSH = [0, 4, -10];
export const CAMERA_LERP_POSITION = 0.08;
export const CAMERA_LERP_LOOKAT = 0.12;
export const CAMERA_LOOK_AHEAD_T = 0.003;
export const CAMERA_FOV_MIN = 60;
export const CAMERA_FOV_MAX = 72;
export const CAMERA_SHAKE_DURATION = 0.3;
export const CAMERA_SHAKE_INTENSITY = 0.1;

// ============================================================
// Game
// ============================================================
export const COUNTDOWN_DURATION = 3;        // seconds
export const FINISH_SLOWMO_DURATION = 2;    // seconds
export const FINISH_SLOWMO_FACTOR = 0.3;    // time scale during slow-mo
export const SPLIT_DISPLAY_DURATION = 3;    // seconds to show split time
