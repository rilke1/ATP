/**
 * Glicko-2 rating system implementation.
 *
 * Why Glicko-2 over plain Elo:
 *   - Tracks *uncertainty* (RD) alongside skill (rating).
 *   - RD rises when a player is inactive → appropriately uncertain, not penalized.
 *   - Conservative rank score = rating − 1.5×RD so proven players rank above
 *     lucky streakers with high uncertainty.
 *   - Naturally solves "5-0 vs 35-15 against tougher opponents" — the 5-0 player
 *     keeps high RD and ranks lower until they accumulate evidence.
 */

const SCALE = 173.7178;
const TAU = 0.5; // system volatility constraint (lower = more stable)

export interface Glicko2Rating {
  rating: number;    // default 1500
  rd: number;        // rating deviation, default 350 (new), settles ~50-150
  volatility: number; // default 0.06
}

function toGlicko2Scale(r: Glicko2Rating) {
  return {
    mu: (r.rating - 1500) / SCALE,
    phi: r.rd / SCALE,
    sigma: r.volatility,
  };
}

function fromGlicko2Scale(mu: number, phi: number, sigma: number): Glicko2Rating {
  return {
    rating: mu * SCALE + 1500,
    rd: phi * SCALE,
    volatility: sigma,
  };
}

function g(phi: number) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function E(mu: number, muJ: number, phiJ: number) {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * Update a player's rating after a set of results in one rating period.
 * Pass multiple opponents if doing batch updates; for real-time pass one at a time.
 *
 * @param player   - the player being updated
 * @param results  - array of { opponent, score } where score=1 win, 0=loss, 0.5=draw
 */
export function updateRating(
  player: Glicko2Rating,
  results: Array<{ opponent: Glicko2Rating; score: number }>
): Glicko2Rating {
  const { mu, phi, sigma } = toGlicko2Scale(player);

  if (results.length === 0) {
    // No games played — increase RD only (inactivity penalty)
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return fromGlicko2Scale(mu, phiStar, sigma);
  }

  // Step 3: compute v (estimated variance)
  let v = 0;
  for (const { opponent } of results) {
    const { mu: muJ, phi: phiJ } = toGlicko2Scale(opponent);
    const eVal = E(mu, muJ, phiJ);
    v += g(phiJ) * g(phiJ) * eVal * (1 - eVal);
  }
  v = 1 / v;

  // Step 4: compute delta
  let delta = 0;
  for (const { opponent, score } of results) {
    const { mu: muJ, phi: phiJ } = toGlicko2Scale(opponent);
    delta += g(phiJ) * (score - E(mu, muJ, phiJ));
  }
  delta *= v;

  // Step 5: update volatility via Illinois algorithm
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const eX = Math.exp(x);
    const d2 = delta * delta;
    const phi2 = phi * phi;
    const num = eX * (d2 - phi2 - v - eX);
    const den = 2 * Math.pow(phi2 + v + eX, 2);
    return num / den - (x - a) / (TAU * TAU);
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  const EPSILON = 1e-6;

  for (let i = 0; i < 100 && Math.abs(B - A) > EPSILON; i++) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB < 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  const sigmaPrime = Math.exp(A / 2);

  // Step 6: update phi*
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);

  // Step 7–8: new phi and mu
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  let muPrime = mu;
  for (const { opponent, score } of results) {
    const { mu: muJ, phi: phiJ } = toGlicko2Scale(opponent);
    muPrime += phiPrime * phiPrime * g(phiJ) * (score - E(mu, muJ, phiJ));
  }

  return fromGlicko2Scale(muPrime, phiPrime, sigmaPrime);
}

/**
 * Conservative ranking score used for leaderboard ordering.
 * Rewards certainty: players with high RD rank lower until proven.
 */
export function rankScore(r: Glicko2Rating): number {
  return r.rating - 1.5 * r.rd;
}

export const DEFAULT_RATING: Glicko2Rating = {
  rating: 1500,
  rd: 350,
  volatility: 0.06,
};
