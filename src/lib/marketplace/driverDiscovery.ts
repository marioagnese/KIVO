export type MarketplaceHost = {
  id: number;
  firestoreId?: string;
  ownerUid?: string;

  real?: boolean;
  simulated?: boolean;

  area: string;
  state: string;

  coords: [number, number];

  price: number;

  charger: string;
  speed: string;
  availability: string;
  access: string;

  amenities: string[];

  rating: number;
  reviews: number;

  hostName: string;
  hostBio?: string;

  coverage?: string;
};

export type HostDetour = {
  miles: number;
  minutes: number;
};


/* =========================================================
   GEOGRAPHY
========================================================= */

export function haversineMiles(
  a: [number, number],
  b: [number, number]
): number {
  const toRadians = (
    degrees: number
  ) => (degrees * Math.PI) / 180;

  const earthRadiusMiles =
    3958.8;

  const lat1 =
    toRadians(a[1]);

  const lat2 =
    toRadians(b[1]);

  const deltaLat =
    toRadians(
      b[1] - a[1]
    );

  const deltaLng =
    toRadians(
      b[0] - a[0]
    );

  const sinLat =
    Math.sin(deltaLat / 2);

  const sinLng =
    Math.sin(deltaLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(lat1) *
      Math.cos(lat2) *
      sinLng *
      sinLng;

  return (
    earthRadiusMiles *
    2 *
    Math.atan2(
      Math.sqrt(h),
      Math.sqrt(1 - h)
    )
  );
}


function distancePointToSegmentMiles(
  point: [number, number],
  start: [number, number],
  end: [number, number]
): number {
  const referenceLatitude =
    (
      point[1] +
      start[1] +
      end[1]
    ) / 3;

  const milesPerDegreeLat =
    69;

  const milesPerDegreeLng =
    69 *
    Math.cos(
      (referenceLatitude *
        Math.PI) /
        180
    );

  const px =
    point[0] *
    milesPerDegreeLng;

  const py =
    point[1] *
    milesPerDegreeLat;

  const ax =
    start[0] *
    milesPerDegreeLng;

  const ay =
    start[1] *
    milesPerDegreeLat;

  const bx =
    end[0] *
    milesPerDegreeLng;

  const by =
    end[1] *
    milesPerDegreeLat;

  const dx =
    bx - ax;

  const dy =
    by - ay;

  if (
    dx === 0 &&
    dy === 0
  ) {
    return Math.sqrt(
      (px - ax) ** 2 +
      (py - ay) ** 2
    );
  }

  const t =
    Math.max(
      0,
      Math.min(
        1,
        (
          (px - ax) * dx +
          (py - ay) * dy
        ) /
          (
            dx * dx +
            dy * dy
          )
      )
    );

  const closestX =
    ax + t * dx;

  const closestY =
    ay + t * dy;

  return Math.sqrt(
    (px - closestX) ** 2 +
    (py - closestY) ** 2
  );
}


export function distanceToRoute(
  point: [number, number],
  routeCoordinates: number[][]
): number {
  if (
    routeCoordinates.length <
    2
  ) {
    return Infinity;
  }

  let minimumDistance =
    Infinity;

  for (
    let index = 0;
    index <
    routeCoordinates.length - 1;
    index += 1
  ) {
    const start =
      routeCoordinates[index];

    const end =
      routeCoordinates[
        index + 1
      ];

    const distance =
      distancePointToSegmentMiles(
        point,
        [
          start[0],
          start[1],
        ],
        [
          end[0],
          end[1],
        ]
      );

    if (
      distance <
      minimumDistance
    ) {
      minimumDistance =
        distance;
    }
  }

  return minimumDistance;
}


/* =========================================================
   DISCOVERY
========================================================= */

/*
 * KIVO searches a corridor around the Driver's route,
 * not only Hosts sitting directly beside the route line.
 *
 * 30 miles is the initial marketplace ceiling.
 * Ranking below still strongly favors the smallest detour.
 *
 * Keeping this as an explicit constant also lets KIVO
 * move to adaptive rural / charger-desert corridors later.
 */
export const ROUTE_CORRIDOR_MILES =
  30;

export const DESTINATION_RADIUS_MILES =
  30;


export function discoverHostsForRoute({
  hosts,
  routeCoordinates,
  destination,
}: {
  hosts: MarketplaceHost[];
  routeCoordinates: number[][];
  destination: [number, number];
}): MarketplaceHost[] {
  return hosts.filter(
    (host) => {
      const routeDistance =
        distanceToRoute(
          host.coords,
          routeCoordinates
        );

      const destinationDistance =
        haversineMiles(
          host.coords,
          destination
        );

      return (
        routeDistance <=
          ROUTE_CORRIDOR_MILES ||
        (
          host.coverage ===
            "destination" &&
          destinationDistance <=
            DESTINATION_RADIUS_MILES
        )
      );
    }
  );
}


/* =========================================================
   DETOUR
========================================================= */

export function getHostDetour(
  host: MarketplaceHost,
  routeCoordinates: number[][]
): HostDetour {
  if (
    !routeCoordinates.length
  ) {
    return {
      miles: 0,
      minutes: 0,
    };
  }

  const miles =
    distanceToRoute(
      host.coords,
      routeCoordinates
    );

  // MVP estimate:
  // local deviation averaging
  // approximately 25 mph.
  const minutes =
    Math.max(
      2,
      Math.round(
        (miles / 25) * 60
      )
    );

  return {
    miles:
      Math.round(
        miles * 10
      ) / 10,

    minutes,
  };
}


/* =========================================================
   RANKING
========================================================= */

export function getHostSpeedKw(
  host: MarketplaceHost
): number {
  const match =
    host.speed.match(
      /[\d.]+/
    );

  return match
    ? Number(match[0])
    : 0;
}


export function getHostRankingRating(
  host: MarketplaceHost
): number {
  if (
    host.reviews <= 0 ||
    !Number.isFinite(
      host.rating
    ) ||
    host.rating <= 0
  ) {
    // Neutral internal value
    // for a new Host.
    // Never display this as
    // an actual review rating.
    return 4.6;
  }

  return host.rating;
}


export function getHostMatchScore(
  host: MarketplaceHost,
  routeCoordinates: number[][]
): number {
  const detour =
    getHostDetour(
      host,
      routeCoordinates
    );

  const speedKw =
    getHostSpeedKw(host);

  let score = 0;

  // Route convenience carries
  // the strongest weight.
  score +=
    detour.minutes * 3.5;

  score +=
    detour.miles * 2;

  // Price matters without
  // overpowering convenience.
  score +=
    host.price * 0.65;

  // Better ratings help.
  score -=
    getHostRankingRating(
      host
    ) * 4;

  // Faster charging helps.
  score -=
    speedKw * 0.55;

  // Useful amenities provide
  // a modest benefit.
  score -=
    Math.min(
      host.amenities.length,
      4
    ) * 0.75;

  if (
    host.coverage ===
    "corridor"
  ) {
    score -= 3;
  }

  if (
    host.coverage ===
    "destination"
  ) {
    score += 1;
  }

  return score;
}


export function rankHosts(
  hosts: MarketplaceHost[],
  routeCoordinates: number[][]
): MarketplaceHost[] {
  return [...hosts].sort(
    (a, b) =>
      getHostMatchScore(
        a,
        routeCoordinates
      ) -
      getHostMatchScore(
        b,
        routeCoordinates
      )
  );
}
