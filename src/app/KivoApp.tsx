"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Feature, LineString } from "geojson";

import AccountModal from "@/components/AccountModal";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

type BookingRequest = {
  id: string;
  status: "pending" | "accepted" | "declined" | "completed";
  privateAddress?: string;
  arrivalInstructions?: string;
  driverUid: string;
  driverEmail: string;
  hostUid: string;
  hostListingId: string;
  hostArea: string;
  hostState: string;
  requestedTime: string;
  vehicleConnector: string;
  price: number;
  currency: string;
  charger: string;
  speed: string;
  access: string;
  route?: {
    from?: string;
    fromRegion?: string;
    to?: string;
    toRegion?: string;
    miles?: number | null;
    hours?: number | null;
  };
};

type Host = {
  id: number;
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
  coverage: "corridor" | "detour" | "destination";
  simulated?: boolean;

  // Real marketplace listing loaded from Firestore.
  real?: boolean;
  firestoreId?: string;
  ownerUid?: string;
};

const allHosts: Host[] = [
  // ========================================================
  // TEXAS — Houston / Dallas / Austin / San Antonio
  // ========================================================

  {
    id: 1,
    area: "Katy",
    state: "TX",
    coords: [-95.8245, 29.7858],
    price: 12,
    charger: "Level 2 · J1772",
    speed: "9.6 kW",
    availability: "Today · 6 PM – 11 PM",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Restroom", "Coffee"],
    rating: 4.9,
    reviews: 18,
    hostName: "Michael",
    coverage: "detour",
  },
  {
    id: 2,
    area: "Conroe",
    state: "TX",
    coords: [-95.4561, 30.3119],
    price: 9,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 2 PM – 10 PM",
    access: "Driveway",
    amenities: ["Restroom", "Coffee"],
    rating: 4.8,
    reviews: 11,
    hostName: "Sarah",
    coverage: "corridor",
  },
  {
    id: 3,
    area: "Huntsville",
    state: "TX",
    coords: [-95.5508, 30.7235],
    price: 11,
    charger: "Level 2 · J1772",
    speed: "7.7 kW",
    availability: "Today · 4 PM – Midnight",
    access: "Outdoor parking",
    amenities: ["Wi-Fi", "Workspace"],
    rating: 4.9,
    reviews: 9,
    hostName: "Daniel",
    coverage: "corridor",
  },
  {
    id: 4,
    area: "Madisonville",
    state: "TX",
    coords: [-95.9116, 30.9499],
    price: 8,
    charger: "Level 2 · J1772",
    speed: "7.7 kW",
    availability: "Tomorrow · 8 AM – 8 PM",
    access: "Private driveway",
    amenities: ["Charger only"],
    rating: 4.7,
    reviews: 7,
    hostName: "Chris",
    coverage: "corridor",
  },
  {
    id: 5,
    area: "Corsicana",
    state: "TX",
    coords: [-96.4689, 32.0954],
    price: 10,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 3 PM – 9 PM",
    access: "Driveway",
    amenities: ["Wi-Fi", "Restroom"],
    rating: 4.9,
    reviews: 13,
    hostName: "Amanda",
    coverage: "corridor",
  },
  {
    id: 6,
    area: "Waxahachie",
    state: "TX",
    coords: [-96.8483, 32.3865],
    price: 13,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 5 PM – 11 PM",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Restroom", "Family friendly"],
    rating: 5.0,
    reviews: 16,
    hostName: "Robert",
    coverage: "corridor",
  },

  // Houston → Austin
  {
    id: 7,
    area: "Hempstead",
    state: "TX",
    coords: [-96.0783, 30.0974],
    price: 10,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 8 AM – 8 PM",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Coffee"],
    rating: 4.8,
    reviews: 10,
    hostName: "Lisa",
    coverage: "corridor",
  },
  {
    id: 8,
    area: "Brenham",
    state: "TX",
    coords: [-96.3977, 30.1669],
    price: 11,
    charger: "Level 2 · J1772",
    speed: "9.6 kW",
    availability: "Today · 9 AM – 9 PM",
    access: "Driveway",
    amenities: ["Restroom", "Coffee"],
    rating: 4.9,
    reviews: 12,
    hostName: "Mark",
    coverage: "corridor",
  },
  {
    id: 9,
    area: "Elgin",
    state: "TX",
    coords: [-97.3703, 30.3497],
    price: 9,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · Noon – 10 PM",
    access: "Private driveway",
    amenities: ["Wi-Fi"],
    rating: 4.7,
    reviews: 8,
    hostName: "Jennifer",
    coverage: "corridor",
  },

  // Houston → San Antonio
  {
    id: 10,
    area: "Sealy",
    state: "TX",
    coords: [-96.1572, 29.7808],
    price: 8,
    charger: "Level 2 · J1772",
    speed: "7.7 kW",
    availability: "Today · 10 AM – 8 PM",
    access: "Driveway",
    amenities: ["Charger only"],
    rating: 4.8,
    reviews: 6,
    hostName: "Carlos",
    coverage: "corridor",
  },
  {
    id: 11,
    area: "Columbus",
    state: "TX",
    coords: [-96.5397, 29.7066],
    price: 10,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 7 AM – 10 PM",
    access: "Private driveway",
    amenities: ["Restroom", "Coffee"],
    rating: 4.9,
    reviews: 14,
    hostName: "Emily",
    coverage: "corridor",
  },
  {
    id: 12,
    area: "Seguin",
    state: "TX",
    coords: [-97.9647, 29.5688],
    price: 12,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 3 PM – Midnight",
    access: "Driveway",
    amenities: ["Wi-Fi", "Restroom"],
    rating: 4.9,
    reviews: 15,
    hostName: "David",
    coverage: "corridor",
  },

  // ========================================================
  // REMOTE TEXAS / BIG BEND — destination coverage
  // ========================================================

  {
    id: 13,
    area: "Alpine",
    state: "TX",
    coords: [-103.6610, 30.3585],
    price: 14,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 8 AM – Midnight",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Restroom", "Coffee"],
    rating: 4.9,
    reviews: 21,
    hostName: "James",
    coverage: "destination",
  },
  {
    id: 14,
    area: "Marathon",
    state: "TX",
    coords: [-103.1735, 30.2050],
    price: 13,
    charger: "Level 2 · J1772",
    speed: "9.6 kW",
    availability: "Today · Noon – Midnight",
    access: "Gravel driveway",
    amenities: ["Restroom", "Coffee", "Outdoor seating"],
    rating: 4.8,
    reviews: 9,
    hostName: "Laura",
    coverage: "destination",
  },
  {
    id: 15,
    area: "Terlingua",
    state: "TX",
    coords: [-103.6166, 29.3213],
    price: 16,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 4 PM – 11 PM",
    access: "Private property parking",
    amenities: ["Wi-Fi", "Coffee", "Restroom", "Outdoor seating"],
    rating: 5.0,
    reviews: 12,
    hostName: "Rebecca",
    coverage: "destination",
  },

  // ========================================================
  // ATLANTA → MIAMI
  // ========================================================

  {
    id: 16,
    area: "Macon",
    state: "GA",
    coords: [-83.6324, 32.8407],
    price: 10,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 8 AM – 10 PM",
    access: "Driveway",
    amenities: ["Wi-Fi", "Restroom"],
    rating: 4.8,
    reviews: 17,
    hostName: "Kevin",
    coverage: "corridor",
  },
  {
    id: 17,
    area: "Valdosta",
    state: "GA",
    coords: [-83.2785, 30.8327],
    price: 9,
    charger: "Level 2 · J1772",
    speed: "9.6 kW",
    availability: "Today · 9 AM – Midnight",
    access: "Private driveway",
    amenities: ["Coffee", "Restroom", "Family friendly"],
    rating: 4.9,
    reviews: 20,
    hostName: "Monica",
    coverage: "corridor",
  },
  {
    id: 18,
    area: "Lake City",
    state: "FL",
    coords: [-82.6393, 30.1897],
    price: 11,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 7 AM – 11 PM",
    access: "Driveway",
    amenities: ["Wi-Fi", "Restroom", "Coffee"],
    rating: 4.9,
    reviews: 15,
    hostName: "Andrew",
    coverage: "corridor",
  },
  {
    id: 19,
    area: "Ocala",
    state: "FL",
    coords: [-82.1401, 29.1872],
    price: 12,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 10 AM – 10 PM",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Workspace", "Restroom"],
    rating: 4.8,
    reviews: 18,
    hostName: "Natalie",
    coverage: "corridor",
  },
  {
    id: 20,
    area: "Fort Pierce",
    state: "FL",
    coords: [-80.3256, 27.4467],
    price: 10,
    charger: "Level 2 · J1772",
    speed: "9.6 kW",
    availability: "Today · Noon – Midnight",
    access: "Driveway",
    amenities: ["Restroom", "Outdoor seating"],
    rating: 4.7,
    reviews: 11,
    hostName: "Steven",
    coverage: "detour",
  },

  // Remote Southeast / mountain destination
  {
    id: 21,
    area: "Blue Ridge",
    state: "GA",
    coords: [-84.3241, 34.8639],
    price: 15,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 3 PM – Midnight",
    access: "Cabin driveway",
    amenities: ["Wi-Fi", "Coffee", "Outdoor seating"],
    rating: 5.0,
    reviews: 24,
    hostName: "Michelle",
    coverage: "destination",
  },

  // ========================================================
  // DALLAS → CHICAGO
  // ========================================================

  {
    id: 22,
    area: "Durant",
    state: "OK",
    coords: [-96.3708, 33.9939],
    price: 9,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 8 AM – 9 PM",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Restroom"],
    rating: 4.8,
    reviews: 10,
    hostName: "Brian",
    coverage: "corridor",
  },
  {
    id: 23,
    area: "McAlester",
    state: "OK",
    coords: [-95.7697, 34.9334],
    price: 10,
    charger: "Level 2 · J1772",
    speed: "9.6 kW",
    availability: "Today · 8 AM – Midnight",
    access: "Driveway",
    amenities: ["Coffee", "Restroom"],
    rating: 4.8,
    reviews: 13,
    hostName: "Rachel",
    coverage: "corridor",
  },
  {
    id: 24,
    area: "Tulsa",
    state: "OK",
    coords: [-95.9928, 36.1540],
    price: 11,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 6 AM – Midnight",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Workspace", "Restroom"],
    rating: 4.9,
    reviews: 22,
    hostName: "Jonathan",
    coverage: "corridor",
  },
  {
    id: 25,
    area: "Springfield",
    state: "MO",
    coords: [-93.2923, 37.2089],
    price: 10,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 9 AM – 10 PM",
    access: "Driveway",
    amenities: ["Wi-Fi", "Coffee"],
    rating: 4.7,
    reviews: 14,
    hostName: "Ashley",
    coverage: "corridor",
  },
  {
    id: 26,
    area: "Rolla",
    state: "MO",
    coords: [-91.7713, 37.9514],
    price: 9,
    charger: "Level 2 · J1772",
    speed: "9.6 kW",
    availability: "Today · 10 AM – 9 PM",
    access: "Private driveway",
    amenities: ["Restroom", "Coffee"],
    rating: 4.8,
    reviews: 8,
    hostName: "Paul",
    coverage: "corridor",
  },
  {
    id: 27,
    area: "Springfield",
    state: "IL",
    coords: [-89.6501, 39.7817],
    price: 12,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 7 AM – 11 PM",
    access: "Driveway",
    amenities: ["Wi-Fi", "Restroom"],
    rating: 4.9,
    reviews: 16,
    hostName: "Kim",
    coverage: "corridor",
  },

  // ========================================================
  // LOS ANGELES → SAN DIEGO
  // ========================================================

  {
    id: 28,
    area: "Anaheim",
    state: "CA",
    coords: [-117.9143, 33.8366],
    price: 14,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 7 AM – Midnight",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Restroom", "Coffee"],
    rating: 4.9,
    reviews: 31,
    hostName: "Jason",
    coverage: "corridor",
  },
  {
    id: 29,
    area: "San Clemente",
    state: "CA",
    coords: [-117.6120, 33.4269],
    price: 15,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 8 AM – Midnight",
    access: "Driveway",
    amenities: ["Wi-Fi", "Outdoor seating", "Restroom"],
    rating: 5.0,
    reviews: 28,
    hostName: "Nicole",
    coverage: "corridor",
  },
  {
    id: 30,
    area: "Oceanside",
    state: "CA",
    coords: [-117.3795, 33.1959],
    price: 13,
    charger: "Level 2 · J1772",
    speed: "9.6 kW",
    availability: "Today · 9 AM – 10 PM",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Coffee"],
    rating: 4.9,
    reviews: 19,
    hostName: "Eric",
    coverage: "corridor",
  },

  // ========================================================
  // REMOTE / SECONDARY-ROAD DEMO DESTINATIONS
  // ========================================================

  {
    id: 31,
    area: "Broken Bow",
    state: "OK",
    coords: [-94.7391, 34.0293],
    price: 14,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 2 PM – Midnight",
    access: "Cabin driveway",
    amenities: ["Wi-Fi", "Coffee", "Outdoor seating", "Family friendly"],
    rating: 5.0,
    reviews: 20,
    hostName: "Melissa",
    coverage: "destination",
  },
  {
    id: 32,
    area: "Fredericksburg",
    state: "TX",
    coords: [-98.8719, 30.2752],
    price: 13,
    charger: "Level 2 · NACS",
    speed: "11.5 kW",
    availability: "Today · 10 AM – Midnight",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Coffee", "Restroom", "Outdoor seating"],
    rating: 4.9,
    reviews: 26,
    hostName: "Susan",
    coverage: "destination",
  },
  {
    id: 33,
    area: "Wimberley",
    state: "TX",
    coords: [-98.0986, 29.9974],
    price: 12,
    charger: "Level 2 · J1772",
    speed: "9.6 kW",
    availability: "Today · 9 AM – 11 PM",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Coffee", "Outdoor seating"],
    rating: 4.9,
    reviews: 17,
    hostName: "Karen",
    coverage: "destination",
  },
];

const demoTrips = [
  {
    label: "Houston → Dallas",
    from: "Houston, TX",
    to: "Dallas, TX",
    type: "Corridor",
  },
  {
    label: "Atlanta → Miami",
    from: "Atlanta, GA",
    to: "Miami, FL",
    type: "Southeast",
  },
  {
    label: "Miami → Houston",
    from: "Miami, FL",
    to: "Houston, TX",
    type: "Long distance",
  },
  {
    label: "Dallas → Chicago",
    from: "Dallas, TX",
    to: "Chicago, IL",
    type: "Multi-state",
  },
  {
    label: "LA → San Diego",
    from: "Los Angeles, CA",
    to: "San Diego, CA",
    type: "California",
  },
  {
    label: "Houston → Big Bend",
    from: "Houston, TX",
    to: "Big Bend National Park, TX",
    type: "Remote",
  },
];

function haversineMiles(
  a: [number, number],
  b: [number, number]
) {
  const R = 3958.8;

  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(x));
}

function distanceToRoute(
  host: [number, number],
  route: number[][]
) {
  let minimum = Infinity;

  // Sampling is sufficient for this validation prototype.
  const step = Math.max(1, Math.floor(route.length / 500));

  for (let i = 0; i < route.length; i += step) {
    const point: [number, number] = [
      route[i][0],
      route[i][1],
    ];

    minimum = Math.min(
      minimum,
      haversineMiles(host, point)
    );
  }

  return minimum;
}


function buildSimulatedRouteHosts(
  route: number[][],
  routeMiles: number
): Host[] {
  if (route.length < 2) return [];

  // Roughly one simulated KIVO option every ~110–130 miles,
  // with sensible limits for short and very long trips.
  // Keep short trips from looking artificially crowded,
  // while still demonstrating a meaningful network on
  // regional and continental journeys.
  let corridorCount = 0;

  if (routeMiles < 75) {
    corridorCount = 1;
  } else if (routeMiles < 250) {
    corridorCount = 2;
  } else if (routeMiles < 600) {
    corridorCount = 5;
  } else if (routeMiles < 1200) {
    corridorCount = 8;
  } else if (routeMiles < 2000) {
    corridorCount = 10;
  } else {
    corridorCount = 14;
  }

  const hostNames = [
    "Alex",
    "Jordan",
    "Taylor",
    "Morgan",
    "Casey",
    "Jamie",
    "Sam",
    "Cameron",
    "Riley",
    "Avery",
    "Drew",
    "Parker",
    "Quinn",
    "Reese",
  ];

  const amenitiesPool = [
    ["Wi-Fi", "Restroom"],
    ["Coffee", "Restroom"],
    ["Wi-Fi", "Coffee"],
    ["Charger only"],
    ["Wi-Fi", "Workspace"],
    ["Restroom", "Outdoor seating"],
    ["Coffee", "Family friendly"],
  ];

  const generated: Host[] = [];

  for (let i = 0; i < corridorCount; i++) {
    // Keep generated hosts away from the exact origin/destination.
    const fraction = (i + 1) / (corridorCount + 1);
    const index = Math.min(
      route.length - 1,
      Math.max(0, Math.floor(fraction * route.length))
    );

    const point = route[index];

    // Slight deterministic offset so the host looks like a real
    // small detour instead of sitting directly on the highway line.
    const direction = i % 2 === 0 ? 1 : -1;
    const lngOffset = direction * (0.025 + (i % 3) * 0.012);
    const latOffset = -direction * (0.018 + (i % 2) * 0.014);

    generated.push({
      id: 10000 + i,
      area: `Route Stop ${i + 1}`,
      state: "KIVO Demo",
      coords: [
        point[0] + lngOffset,
        point[1] + latOffset,
      ],
      price: 9 + (i % 6),
      charger:
        i % 2 === 0
          ? "Level 2 · NACS"
          : "Level 2 · J1772",
      speed:
        i % 3 === 0
          ? "11.5 kW"
          : i % 3 === 1
          ? "9.6 kW"
          : "7.7 kW",
      availability:
        i % 2 === 0
          ? "Today · 8 AM – 10 PM"
          : "Today · 2 PM – Midnight",
      access:
        i % 3 === 0
          ? "Private driveway"
          : i % 3 === 1
          ? "Outdoor parking"
          : "Driveway",
      amenities:
        amenitiesPool[i % amenitiesPool.length],
      rating: 4.7 + (i % 4) * 0.1,
      reviews: 6 + i * 2,
      hostName: hostNames[i % hostNames.length],
      coverage:
        i % 4 === 0 ? "detour" : "corridor",
      simulated: true,
    });
  }

  // Add destination / last-mile coverage.
  // Short local trips need only one. Longer trips can show two.
  const destination = route[route.length - 1];

  generated.push(
    {
      id: 11001,
      area: "Destination Host A",
      state: "KIVO Demo",
      coords: [
        destination[0] + 0.045,
        destination[1] + 0.035,
      ],
      price: 13,
      charger: "Level 2 · NACS",
      speed: "11.5 kW",
      availability: "Today · 4 PM – Midnight",
      access: "Private driveway",
      amenities: ["Wi-Fi", "Restroom", "Coffee"],
      rating: 4.9,
      reviews: 18,
      hostName: "Morgan",
      coverage: "destination",
      simulated: true,
    }
  );

  if (routeMiles >= 150) {
    generated.push({
      id: 11002,
      area: "Destination Host B",
      state: "KIVO Demo",
      coords: [
        destination[0] - 0.055,
        destination[1] + 0.025,
      ],
      price: 11,
      charger: "Level 2 · J1772",
      speed: "9.6 kW",
      availability: "Today · Noon – 10 PM",
      access: "Driveway",
      amenities: ["Wi-Fi", "Outdoor seating"],
      rating: 4.8,
      reviews: 12,
      hostName: "Taylor",
      coverage: "destination",
      simulated: true,
    });
  }

  return generated;
}


const REGION_OPTIONS = [
  { group: "United States", options: [
    ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"],
    ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
    ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"],
    ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"],
    ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
    ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
    ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
    ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
    ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
    ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
    ["NM", "New Mexico"], ["NY", "New York"],
    ["NC", "North Carolina"], ["ND", "North Dakota"],
    ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
    ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
    ["SC", "South Carolina"], ["SD", "South Dakota"],
    ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
    ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
    ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
    ["DC", "District of Columbia"],
  ]},
  { group: "Canada", options: [
    ["AB", "Alberta"], ["BC", "British Columbia"],
    ["MB", "Manitoba"], ["NB", "New Brunswick"],
    ["NL", "Newfoundland and Labrador"],
    ["NS", "Nova Scotia"], ["NT", "Northwest Territories"],
    ["NU", "Nunavut"], ["ON", "Ontario"],
    ["PE", "Prince Edward Island"], ["QC", "Quebec"],
    ["SK", "Saskatchewan"], ["YT", "Yukon"],
  ]},
] as const;

function splitPlaceRegion(value: string) {
  const pieces = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (pieces.length < 2) {
    return {
      place: value.trim(),
      region: "",
    };
  }

  return {
    place: pieces.slice(0, -1).join(", "),
    region: pieces[pieces.length - 1].toUpperCase(),
  };
}


function normalizePlaceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getMapboxFeatureName(feature: any): string {
  if (feature?.text) {
    return String(feature.text);
  }

  if (feature?.place_name) {
    return String(feature.place_name)
      .split(",")[0]
      .trim();
  }

  return "";
}

function placeNameMatches(
  feature: any,
  requestedPlace: string
): boolean {
  const requested =
    normalizePlaceName(requestedPlace);

  const featureName =
    normalizePlaceName(
      getMapboxFeatureName(feature)
    );

  if (!requested || !featureName) {
    return false;
  }

  // Exact normalized match is preferred.
  if (featureName === requested) {
    return true;
  }

  // Also allow harmless Mapbox naming variants such as:
  // "Big Bend National Park" vs "Big Bend National Park Visitor Center"
  // but do NOT allow completely unrelated substitutions.
  const requestedWords = requested.split(" ");
  const featureWords = featureName.split(" ");

  if (
    requestedWords.length >= 2 &&
    requestedWords.every((word) =>
      featureWords.includes(word)
    )
  ) {
    return true;
  }

  return false;
}

function getMapboxRegionCode(feature: any): string {
  const candidates = [
    feature,
    ...(feature?.context ?? []),
  ];

  const region =
    candidates.find(
      (item: any) =>
        item?.id?.startsWith("region.")
    );

  const shortCode =
    region?.properties?.short_code ||
    region?.short_code ||
    "";

  if (!shortCode) return "";

  return shortCode.includes("-")
    ? shortCode.split("-").pop()?.toUpperCase() ?? ""
    : shortCode.toUpperCase();
}

export default function Home() {
  const {
    user,
    accountTypes,
    hasRole,
    logout,
  } = useAuth();

  const [accountModalOpen, setAccountModalOpen] =
    useState(false);

  const [accountModalRole, setAccountModalRole] =
    useState<"driver" | "host">("driver");

  function openAccountModal(
    role: "driver" | "host"
  ) {
    setAccountModalRole(role);
    setAccountModalOpen(true);
  }

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const endpointMarkers = useRef<mapboxgl.Marker[]>([]);

  const [from, setFrom] = useState("Houston");
  const [fromRegion, setFromRegion] = useState("TX");
  const [to, setTo] = useState("Dallas");
  const [toRegion, setToRegion] = useState("TX");

  const [selectedHost, setSelectedHost] =
    useState<Host | null>(null);

  const [selectedTime, setSelectedTime] = useState("6:00 PM");
  const [vehicleConnector, setVehicleConnector] = useState("NACS / Tesla");
  const [requestSent, setRequestSent] = useState(false);

  const [bookingRequestLoading, setBookingRequestLoading] =
    useState(false);

  const [bookingRequestError, setBookingRequestError] =
    useState("");

  const [bookingRequestId, setBookingRequestId] =
    useState<string | null>(null);

  const [routeCoordinates, setRouteCoordinates] = useState<number[][]>([]);

  const [visibleHosts, setVisibleHosts] =
    useState<Host[]>([]);

  const [realHosts, setRealHosts] =
    useState<Host[]>([]);

  const [showOtherOptions, setShowOtherOptions] =
    useState(false);

  const [routeInfo, setRouteInfo] = useState<{
    miles: number;
    hours: number;
  } | null>(null);

  const [hostMode, setHostMode] = useState(false);
  const [hostStep, setHostStep] = useState(1);

  const [hostRequests, setHostRequests] =
    useState<BookingRequest[]>([]);

  const [hostRequestsLoading, setHostRequestsLoading] =
    useState(false);

  const [hostRequestsError, setHostRequestsError] =
    useState("");

  const [hostInboxOpen, setHostInboxOpen] =
    useState(false);

  const [driverRequests, setDriverRequests] =
    useState<BookingRequest[]>([]);

  const [driverRequestsLoading, setDriverRequestsLoading] =
    useState(false);

  const [driverRequestsError, setDriverRequestsError] =
    useState("");

  const [driverInboxOpen, setDriverInboxOpen] =
    useState(false);

  const [arrivalDrafts, setArrivalDrafts] =
    useState<Record<string, {
      privateAddress: string;
      arrivalInstructions: string;
    }>>({});

  const [arrivalSavingId, setArrivalSavingId] =
    useState<string | null>(null);

  const [sessionCompletingId, setSessionCompletingId] =
    useState<string | null>(null);

  const [hostForm, setHostForm] = useState({
    connector: "NACS / Tesla",
    speed: "11.5 kW",
    location: "Katy, TX",
    weekdays: true,
    weekends: false,
    startTime: "6:00 PM",
    endTime: "10:00 PM",
    price: "12",
    access: "Private driveway",
    amenities: ["Wi-Fi", "Restroom"] as string[],
    rules:
      "Park only in the designated charging space. Charging access is limited to your confirmed reservation window.",
  });

  const [hostPublished, setHostPublished] = useState(false);

  const [hostPublishLoading, setHostPublishLoading] =
    useState(false);

  const [hostPublishError, setHostPublishError] =
    useState("");

  const [publishedHostId, setPublishedHostId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      setError("Mapbox token is missing.");
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-96.2, 31],
      zoom: 5.5,
    });

    map.addControl(
      new mapboxgl.NavigationControl(),
      "top-right"
    );

    map.on("click", () => setSelectedHost(null));

    mapRef.current = map;

    return () => {
      markerRefs.current.forEach((marker) =>
        marker.remove()
      );

      endpointMarkers.current.forEach((marker) =>
        marker.remove()
      );

      map.remove();
      mapRef.current = null;
    };
  }, []);

  async function loadRealKivoHosts() {
    if (!db) {
      setRealHosts([]);
      return;
    }

    try {
      const snapshot =
        await getDocs(
          collection(db, "hosts")
        );

      const loadedHosts: Host[] = [];

      snapshot.forEach(
        (documentSnapshot) => {
          const data =
            documentSnapshot.data();

          // Only active marketplace listings belong
          // in driver discovery.
          if (
            data?.status !== "active"
          ) {
            return;
          }

          const lng =
            Number(
              data?.coords?.lng
            );

          const lat =
            Number(
              data?.coords?.lat
            );

          if (
            !Number.isFinite(lng) ||
            !Number.isFinite(lat)
          ) {
            return;
          }

          const sessionPrice =
            Number(
              data?.pricing
                ?.sessionPrice ?? 0
            );

          const connector =
            String(
              data?.charger
                ?.connector ||
                "Unknown"
            );

          const speed =
            String(
              data?.charger
                ?.speed ||
                "Unknown"
            );

          const startTime =
            String(
              data?.availability
                ?.startTime || ""
            );

          const endTime =
            String(
              data?.availability
                ?.endTime || ""
            );

          // The existing Host model uses a numeric ID.
          // Generate a stable-enough negative ID for runtime
          // while preserving the actual Firestore document ID.
          let numericId = 0;

          for (
            const char
            of documentSnapshot.id
          ) {
            numericId =
              (
                numericId * 31 +
                char.charCodeAt(0)
              ) %
              1000000000;
          }

          loadedHosts.push({
            id:
              -Math.max(
                1,
                numericId
              ),

            firestoreId:
              documentSnapshot.id,

            ownerUid:
              String(
                data?.ownerUid || ""
              ),

            real:
              true,

            simulated:
              false,

            area:
              String(
                data?.area ||
                data?.locationLabel ||
                "KIVO Host"
              ),

            state:
              String(
                data?.state || ""
              ),

            coords: [
              lng,
              lat,
            ],

            price:
              Number.isFinite(
                sessionPrice
              )
                ? sessionPrice
                : 0,

            charger:
              `Level 2 · ${connector}`,

            speed,

            availability:
              startTime &&
              endTime
                ? `${startTime} – ${endTime}`
                : "Host availability",

            access:
              String(
                data?.access ||
                "Host property"
              ),

            amenities:
              Array.isArray(
                data?.amenities
              )
                ? data.amenities.filter(
                    (
                      amenity: unknown
                    ): amenity is string =>
                      typeof amenity ===
                      "string"
                  )
                : [],

            // New real listings have no reviews yet.
            // Keep neutral values rather than invent ratings.
            rating:
              typeof data?.rating ===
                "number"
                ? data.rating
                : 0,

            reviews:
              typeof data?.reviews ===
                "number"
                ? data.reviews
                : 0,

            hostName:
              "KIVO Host",

            coverage:
              "corridor",
          });
        }
      );

      setRealHosts(
        loadedHosts
      );

      console.log(
        `✓ Loaded ${loadedHosts.length} real KIVO host listing(s)`
      );
    } catch (err) {
      console.error(
        "Failed to load real KIVO hosts:",
        err
      );
    }
  }

  useEffect(() => {
    loadRealKivoHosts();
  }, []);

  async function geocode(
    place: string,
    region = ""
  ): Promise<[number, number]> {
    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const cleanPlace = place.trim();
    const cleanRegion = region.trim().toUpperCase();

    if (!cleanPlace) {
      throw new Error(
        "Enter a city, town, destination, or place."
      );
    }

    const query = [cleanPlace, cleanRegion]
      .filter(Boolean)
      .join(", ");

    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(query)}.json` +
      `?access_token=${token}` +
      `&limit=10` +
      `&country=US,CA` +
      `&types=place,locality,district,poi,address`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        "Location search is temporarily unavailable."
      );
    }

    const data = await response.json();

    if (!data.features?.length) {
      throw new Error(
        `Could not find "${query}". Check the place and state/province.`
      );
    }

    // Never silently substitute another destination.
    //
    // A result must match BOTH:
    // 1) the place name the user entered
    // 2) the state/province the user selected
    //
    // Example:
    // Calgary + AB -> Calgary, Alberta
    // Calgary + TX -> rejected unless Mapbox genuinely
    // identifies a Calgary locality in Texas.

    const matchingFeature =
      data.features.find((feature: any) => {
        const nameMatches =
          placeNameMatches(
            feature,
            cleanPlace
          );

        const resolvedRegion =
          getMapboxRegionCode(feature);

        const regionMatches =
          !cleanRegion ||
          resolvedRegion === cleanRegion;

        return (
          nameMatches &&
          regionMatches
        );
      });

    if (!matchingFeature) {
      throw new Error(
        `We couldn't confirm "${cleanPlace}" in ${cleanRegion || "the selected region"}. ` +
        `Check the place and state/province before routing.`
      );
    }

    const selectedFeature =
      matchingFeature;

    return selectedFeature.center as [
      number,
      number
    ];
  }

  async function reverseGeocodePlace(
    coords: [number, number]
  ): Promise<{ area: string; state: string }> {
    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      return {
        area: "Nearby KIVO host",
        state: "",
      };
    }

    try {
      const [lng, lat] = coords;

      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${lng},${lat}.json` +
        `?access_token=${token}` +
        `&country=US,CA` +
        `&limit=10`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Reverse geocoding failed.");
      }

      const data = await response.json();
      const features = data.features ?? [];

      // Prefer an actual town/city/locality.
      const locationFeature =
        features.find(
          (feature: any) =>
            feature.place_type?.includes("place")
        ) ??
        features.find(
          (feature: any) =>
            feature.place_type?.includes("locality")
        ) ??
        features.find(
          (feature: any) =>
            feature.place_type?.includes("district")
        );

      // Sometimes the town exists only in the context
      // of an address/POI result.
      const contextSource =
        locationFeature ??
        features.find(
          (feature: any) =>
            Array.isArray(feature.context)
        );

      const contextualPlace =
        contextSource?.context?.find(
          (item: any) =>
            item.id?.startsWith("place.")
        ) ??
        contextSource?.context?.find(
          (item: any) =>
            item.id?.startsWith("locality.")
        ) ??
        contextSource?.context?.find(
          (item: any) =>
            item.id?.startsWith("district.")
        );

      const area =
        locationFeature?.text ||
        contextualPlace?.text ||
        contextualPlace?.place_name?.split(",")[0] ||
        "Nearby KIVO host";

      const state =
        getMapboxRegionCode(
          locationFeature ||
          contextSource ||
          {}
        );

      return {
        area,
        state,
      };
    } catch {
      return {
        area: "Nearby KIVO host",
        state: "",
      };
    }
  }

  async function labelSimulatedHosts(
    hosts: Host[]
  ): Promise<Host[]> {
    return Promise.all(
      hosts.map(async (host) => {
        if (!host.simulated) return host;

        const location =
          await reverseGeocodePlace(host.coords);

        return {
          ...host,
          area: location.area,
          state: location.state,
        };
      })
    );
  }

  function renderHostMarkers(hosts: Host[]) {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) =>
      marker.remove()
    );

    markerRefs.current = [];

    hosts.forEach((host) => {
      const marker = new mapboxgl.Marker({
        // Cyan = real Firestore marketplace listing
        // Green = sample/simulated validation coverage
        color: host.real
          ? "#22d3ee"
          : "#34d399",

        scale: host.real
          ? 1.45
          : 1,
      })
        .setLngLat(host.coords)
        .addTo(map);

      if (host.real) {
        const markerElement =
          marker.getElement();

        markerElement.setAttribute(
          "title",
          "Live KIVO Host"
        );

        markerElement.style.filter =
          "drop-shadow(0 0 7px rgba(34, 211, 238, 0.95))";

        markerElement.style.zIndex =
          "5";
      }

      marker.getElement().style.cursor =
        "pointer";

      marker
        .getElement()
        .addEventListener("click", (event) => {
          event.stopPropagation();
          setSelectedHost(host);
          setRequestSent(false);
          setBookingRequestError("");
          setBookingRequestId(null);
        });

      markerRefs.current.push(marker);
    });
  }

  async function findRoute() {
    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const map = mapRef.current;

    if (!token || !map) return;

    try {
      setLoading(true);
      setError("");
      setSelectedHost(null);
      setShowOtherOptions(false);
      setRouteInfo(null);

      const start = await geocode(
        from,
        fromRegion
      );

      const end = await geocode(
        to,
        toRegion
      );

      const directionsUrl =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${start[0]},${start[1]};${end[0]},${end[1]}` +
        `?geometries=geojson&overview=full&access_token=${token}`;

      const response = await fetch(directionsUrl);
      const data = await response.json();

      if (!data.routes?.length) {
        throw new Error(
          "No driving route could be found."
        );
      }

      const route = data.routes[0];

      const geojson: Feature<LineString> = {
        type: "Feature",
        properties: {},
        geometry: route.geometry,
      };

      if (map.getSource("kivo-route")) {
        (
          map.getSource(
            "kivo-route"
          ) as mapboxgl.GeoJSONSource
        ).setData(geojson);
      } else {
        map.addSource("kivo-route", {
          type: "geojson",
          data: geojson,
        });

        map.addLayer({
          id: "kivo-route-line",
          type: "line",
          source: "kivo-route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#34d399",
            "line-width": 5,
            "line-opacity": 0.9,
          },
        });
      }

      endpointMarkers.current.forEach(
        (marker) => marker.remove()
      );

      endpointMarkers.current = [];

      const startMarker = new mapboxgl.Marker({
        color: "#60a5fa",
        scale: 1.2,
      })
        .setLngLat(start)
        .addTo(map);

      const endMarker = new mapboxgl.Marker({
        color: "#f59e0b",
        scale: 1.2,
      })
        .setLngLat(end)
        .addTo(map);

      endpointMarkers.current = [
        startMarker,
        endMarker,
      ];

      const routeCoordinates =
        route.geometry.coordinates as number[][];

      setRouteCoordinates(routeCoordinates);

      // KIVO Phase 1 discovery model:
      // 1) corridor/small-detour hosts within 12 miles of the driving route
      // 2) destination hosts within 30 miles of where the driver is going
      //
      // This lets the demo show both highway-adjacent coverage and the
      // rural / last-mile use case where KIVO may be most differentiated.
      const marketplaceHosts = [
        ...allHosts,
        ...realHosts,
      ];

      const nearbyHosts =
        marketplaceHosts.filter((host) => {
        const routeDistance = distanceToRoute(
          host.coords,
          routeCoordinates
        );

        const destinationDistance = haversineMiles(
          host.coords,
          end
        );

        return (
          routeDistance <= 12 ||
          (
            host.coverage === "destination" &&
            destinationDistance <= 30
          )
        );
      });

      // Add simulated KIVO coverage along the calculated route.
      // This makes the validation prototype usable across the USA
      // and Canada without pretending these are live marketplace hosts.
      const simulatedRouteHosts =
        buildSimulatedRouteHosts(
          routeCoordinates,
          route.distance / 1609.344
        );

      // Give simulated pins real nearby city/town labels.
      // Example: a generated point near Sealy should display
      // "Sealy, TX" rather than "Route Stop 2".
      const labeledSimulatedHosts =
        await labelSimulatedHosts(
          simulatedRouteHosts
        );

      // If an existing sample host already covers approximately
      // the same area, don't stack a simulated host on top of it.
      const deduplicatedSimulatedHosts =
        labeledSimulatedHosts.filter(
          (simulatedHost) =>
            !nearbyHosts.some(
              (existingHost) =>
                haversineMiles(
                  simulatedHost.coords,
                  existingHost.coords
                ) < 12
            )
        );

      const discoveredHosts = [
        ...nearbyHosts,
        ...deduplicatedSimulatedHosts,
      ];

      setVisibleHosts(discoveredHosts);
      renderHostMarkers(discoveredHosts);

      const bounds =
        new mapboxgl.LngLatBounds();

      routeCoordinates.forEach(
        (coord: number[]) => {
          bounds.extend([
            coord[0],
            coord[1],
          ]);
        }
      );

      map.fitBounds(bounds, {
        padding: 70,
        duration: 900,
      });

      setRouteInfo({
        miles: Math.round(
          route.distance / 1609.344
        ),
        hours:
          Math.round(
            (route.duration / 3600) * 10
          ) / 10,
      });
    } catch (err) {
      setVisibleHosts([]);
      renderHostMarkers([]);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }


  function getHostDetour(host: Host) {
    if (!routeCoordinates.length) {
      return { miles: 0, minutes: 0 };
    }

    const miles = distanceToRoute(
      host.coords,
      routeCoordinates
    );

    // MVP approximation: local detour averaging ~25 mph.
    const minutes = Math.max(
      2,
      Math.round((miles / 25) * 60)
    );

    return {
      miles: Math.round(miles * 10) / 10,
      minutes,
    };
  }

  function getHostSpeedKw(host: Host): number {
    const match = host.speed.match(/[\d.]+/);

    return match
      ? Number(match[0])
      : 0;
  }

  function getHostMatchScore(host: Host): number {
    const detour = getHostDetour(host);
    const speedKw = getHostSpeedKw(host);

    // Lower score = better match.
    //
    // Route convenience intentionally carries the most weight.
    // KIVO should first answer:
    // "How disruptive is this charging stop to my trip?"
    //
    // Then use price, rating, speed and amenities
    // to distinguish otherwise similar options.
    let score = 0;

    // Detour is the strongest factor.
    score += detour.minutes * 3.5;
    score += detour.miles * 2;

    // Price matters, but should not overpower convenience.
    score += host.price * 0.65;

    // Reward higher-rated hosts.
    score -= getHostRankingRating(host) * 4;

    // Reward faster Level 2 charging.
    score -= speedKw * 0.55;

    // A few useful amenities improve the experience.
    score -= Math.min(host.amenities.length, 4) * 0.75;

    // Small preference for hosts directly along the route.
    if (host.coverage === "corridor") {
      score -= 3;
    }

    // Destination hosts are valuable near the end of a trip,
    // but should not dominate ordinary corridor rankings.
    if (host.coverage === "destination") {
      score += 1;
    }

    return score;
  }

  function getHostRankingRating(
    host: Host
  ): number {
    if (
      host.reviews <= 0 ||
      !Number.isFinite(host.rating) ||
      host.rating <= 0
    ) {
      // Neutral internal score for a brand-new host.
      // This value is used only for ranking,
      // never displayed as an actual review rating.
      return 4.6;
    }

    return host.rating;
  }

  function getRankedHosts(): Host[] {
    return [...visibleHosts]
      .sort(
        (a, b) =>
          getHostMatchScore(a) -
          getHostMatchScore(b)
      )
      .slice(0, 5);
  }

  function getFeaturedHosts() {
    if (!visibleHosts.length) {
      return {
        bestMatch: null,
        closest: null,
        bestValue: null,
        others: [],
      };
    }

    // ========================================================
    // BEST MATCH
    // Existing KIVO composite ranking:
    // detour + price + rating + speed + amenities.
    // ========================================================

    const bestMatch =
      [...visibleHosts].sort(
        (a, b) =>
          getHostMatchScore(a) -
          getHostMatchScore(b)
      )[0] ?? null;

    // ========================================================
    // CLOSEST
    // Lowest estimated route detour.
    //
    // Prefer a host different from Best Match so the driver
    // gets genuinely different choices whenever possible.
    // ========================================================

    const closestPool =
      visibleHosts.filter(
        (host) =>
          host.id !== bestMatch?.id
      );

    const closestCandidates =
      closestPool.length
        ? closestPool
        : visibleHosts;

    const closest =
      [...closestCandidates].sort(
        (a, b) => {
          const detourA =
            getHostDetour(a);

          const detourB =
            getHostDetour(b);

          if (
            detourA.minutes !==
            detourB.minutes
          ) {
            return (
              detourA.minutes -
              detourB.minutes
            );
          }

          return (
            detourA.miles -
            detourB.miles
          );
        }
      )[0] ?? null;

    // ========================================================
    // BEST VALUE
    //
    // NOT merely the cheapest host.
    //
    // Lower price helps.
    // Lower detour helps.
    // Faster charging helps.
    // ========================================================

    const alreadyFeaturedIds =
      new Set(
        [
          bestMatch?.id,
          closest?.id,
        ].filter(
          (id): id is number =>
            id !== undefined
        )
      );

    const valuePool =
      visibleHosts.filter(
        (host) =>
          !alreadyFeaturedIds.has(
            host.id
          )
      );

    const valueCandidates =
      valuePool.length
        ? valuePool
        : visibleHosts;

    function getValueScore(
      host: Host
    ) {
      const detour =
        getHostDetour(host);

      const speedKw =
        getHostSpeedKw(host);

      return (
        // Price matters most for value.
        host.price * 2 +

        // But a large deviation reduces the value.
        detour.minutes * 0.55 +
        detour.miles * 0.25 -

        // Faster charging improves value.
        speedKw * 0.4 -

        // Strong ratings provide a modest benefit.
        getHostRankingRating(host) * 0.6
      );
    }

    const bestValue =
      [...valueCandidates].sort(
        (a, b) =>
          getValueScore(a) -
          getValueScore(b)
      )[0] ?? null;

    // ========================================================
    // EVERYTHING ELSE
    // ========================================================

    const featuredIds =
      new Set(
        [
          bestMatch?.id,
          closest?.id,
          bestValue?.id,
        ].filter(
          (id): id is number =>
            id !== undefined
        )
      );

    const others =
      [...visibleHosts]
        .filter(
          (host) =>
            !featuredIds.has(
              host.id
            )
        )
        .sort(
          (a, b) =>
            getHostMatchScore(a) -
            getHostMatchScore(b)
        );

    return {
      bestMatch,
      closest,
      bestValue,
      others,
    };
  }

  async function loadDriverRequests() {
    if (!user || !db) {
      setDriverRequests([]);
      return;
    }

    setDriverRequestsLoading(true);
    setDriverRequestsError("");

    try {
      const requestQuery = query(
        collection(db, "bookingRequests"),
        where("driverUid", "==", user.uid)
      );

      const snapshot =
        await getDocs(requestQuery);

      const requests: BookingRequest[] = [];

      snapshot.forEach((requestDoc) => {
        const data =
          requestDoc.data();

        requests.push({
          id:
            requestDoc.id,

          status:
            data.status,

          driverUid:
            data.driverUid || "",

          driverEmail:
            data.driverEmail || "",

          hostUid:
            data.hostUid || "",

          hostListingId:
            data.hostListingId || "",

          hostArea:
            data.hostArea || "",

          hostState:
            data.hostState || "",

          requestedTime:
            data.requestedTime || "",

          vehicleConnector:
            data.vehicleConnector || "",

          price:
            Number(data.price || 0),

          currency:
            data.currency || "USD",

          charger:
            data.charger || "",

          speed:
            data.speed || "",

          access:
            data.access || "",

          route:
            data.route || undefined,

          privateAddress:
            data.privateAddress || "",

          arrivalInstructions:
            data.arrivalInstructions || "",
        });
      });

      // Pending first, then accepted, then declined.
      const statusOrder = {
        pending: 0,
        accepted: 1,
        completed: 2,
        declined: 3,
      };

      requests.sort(
        (a, b) =>
          statusOrder[a.status] -
          statusOrder[b.status]
      );

      setDriverRequests(
        requests
      );
    } catch (err) {
      console.error(
        "Failed to load driver requests:",
        err
      );

      setDriverRequestsError(
        err instanceof Error
          ? err.message
          : "Could not load your charging requests."
      );
    } finally {
      setDriverRequestsLoading(false);
    }
  }

  async function loadHostRequests() {
    if (!user || !db) {
      setHostRequests([]);
      return;
    }

    setHostRequestsLoading(true);
    setHostRequestsError("");

    try {
      const requestQuery = query(
        collection(db, "bookingRequests"),
        where("hostUid", "==", user.uid)
      );

      const snapshot =
        await getDocs(requestQuery);

      const requests: BookingRequest[] = [];

      snapshot.forEach((requestDoc) => {
        const data =
          requestDoc.data();

        requests.push({
          id: requestDoc.id,

          status:
            data.status,

          driverUid:
            data.driverUid || "",

          driverEmail:
            data.driverEmail || "",

          hostUid:
            data.hostUid || "",

          hostListingId:
            data.hostListingId || "",

          hostArea:
            data.hostArea || "",

          hostState:
            data.hostState || "",

          requestedTime:
            data.requestedTime || "",

          vehicleConnector:
            data.vehicleConnector || "",

          price:
            Number(data.price || 0),

          currency:
            data.currency || "USD",

          charger:
            data.charger || "",

          speed:
            data.speed || "",

          access:
            data.access || "",

          route:
            data.route || undefined,

          privateAddress:
            data.privateAddress || "",

          arrivalInstructions:
            data.arrivalInstructions || "",
        });
      });

      requests.sort((a, b) => {
        if (
          a.status === "pending" &&
          b.status !== "pending"
        ) {
          return -1;
        }

        if (
          a.status !== "pending" &&
          b.status === "pending"
        ) {
          return 1;
        }

        return 0;
      });

      setHostRequests(
        requests
      );
    } catch (err) {
      console.error(
        "Failed to load host requests:",
        err
      );

      setHostRequestsError(
        err instanceof Error
          ? err.message
          : "Could not load incoming requests."
      );
    } finally {
      setHostRequestsLoading(false);
    }
  }

  async function updateHostRequestStatus(
    requestId: string,
    status: "accepted" | "declined" | "completed"
  ) {
    if (!db || !user) {
      return;
    }

    try {
      const requestRef =
        doc(
          db,
          "bookingRequests",
          requestId
        );

      await updateDoc(
        requestRef,
        {
          status,
          updatedAt:
            serverTimestamp(),
        }
      );

      setHostRequests(
        (current) =>
          current.map(
            (request) =>
              request.id === requestId
                ? {
                    ...request,
                    status,
                  }
                : request
          )
      );
    } catch (err) {
      console.error(
        "Failed to update request status:",
        err
      );

      setHostRequestsError(
        err instanceof Error
          ? err.message
          : "Could not update request."
      );
    }
  }

  function updateArrivalDraft(
    request: BookingRequest,
    field: "privateAddress" | "arrivalInstructions",
    value: string
  ) {
    setArrivalDrafts((current) => ({
      ...current,
      [request.id]: {
        privateAddress:
          current[request.id]?.privateAddress ??
          request.privateAddress ??
          "",
        arrivalInstructions:
          current[request.id]?.arrivalInstructions ??
          request.arrivalInstructions ??
          "",
        [field]: value,
      },
    }));
  }

  async function saveArrivalDetails(
    request: BookingRequest
  ) {
    if (!db || !user) return;

    const draft =
      arrivalDrafts[request.id] ?? {
        privateAddress:
          request.privateAddress ?? "",
        arrivalInstructions:
          request.arrivalInstructions ?? "",
      };

    const privateAddress =
      draft.privateAddress.trim();

    const arrivalInstructions =
      draft.arrivalInstructions.trim();

    if (!privateAddress) {
      setHostRequestsError(
        "Enter the private charging address."
      );
      return;
    }

    if (!arrivalInstructions) {
      setHostRequestsError(
        "Enter arrival instructions for the driver."
      );
      return;
    }

    setArrivalSavingId(request.id);
    setHostRequestsError("");

    try {
      await updateDoc(
        doc(
          db,
          "bookingRequests",
          request.id
        ),
        {
          privateAddress,
          arrivalInstructions,
          arrivalDetailsSharedAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      );

      setHostRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? {
                ...item,
                privateAddress,
                arrivalInstructions,
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Failed to save arrival details:",
        err
      );

      setHostRequestsError(
        err instanceof Error
          ? err.message
          : "Could not save arrival details."
      );
    } finally {
      setArrivalSavingId(null);
    }
  }

  async function completeChargingSession(
    request: BookingRequest
  ) {
    if (!db || !user) return;

    if (
      !request.privateAddress ||
      !request.arrivalInstructions
    ) {
      setHostRequestsError(
        "Save the arrival details before completing the session."
      );
      return;
    }

    setSessionCompletingId(request.id);
    setHostRequestsError("");

    try {
      await updateDoc(
        doc(
          db,
          "bookingRequests",
          request.id
        ),
        {
          status: "completed",
          completedAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),

          // Future payment architecture.
          // No money moves yet.
          settlementStatus:
            "not_started",
        }
      );

      setHostRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: "completed",
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Failed to complete session:",
        err
      );

      setHostRequestsError(
        err instanceof Error
          ? err.message
          : "Could not complete the charging session."
      );
    } finally {
      setSessionCompletingId(null);
    }
  }

  async function requestChargingSession() {
    setBookingRequestError("");

    if (!selectedHost) {
      return;
    }

    // --------------------------------------------------------
    // SAMPLE / SIMULATED HOSTS
    // Keep existing Phase 1 demo behavior.
    // --------------------------------------------------------

    if (!selectedHost.real) {
      setRequestSent(true);
      return;
    }

    // --------------------------------------------------------
    // REAL MARKETPLACE HOST
    // --------------------------------------------------------

    if (!user) {
      openAccountModal("driver");
      return;
    }

    if (!hasRole("driver")) {
      openAccountModal("driver");
      return;
    }

    if (!db) {
      setBookingRequestError(
        "KIVO database is not available."
      );
      return;
    }

    if (
      !selectedHost.firestoreId ||
      !selectedHost.ownerUid
    ) {
      setBookingRequestError(
        "This KIVO host listing is missing marketplace information."
      );
      return;
    }

    setBookingRequestLoading(true);

    try {
      const ref = await addDoc(
        collection(
          db,
          "bookingRequests"
        ),
        {
          status:
            "pending",

          driverUid:
            user.uid,

          driverEmail:
            user.email || "",

          hostUid:
            selectedHost.ownerUid,

          hostListingId:
            selectedHost.firestoreId,

          hostArea:
            selectedHost.area,

          hostState:
            selectedHost.state,

          requestedTime:
            selectedTime,

          vehicleConnector:
            vehicleConnector,

          price:
            selectedHost.price,

          currency:
            "USD",

          charger:
            selectedHost.charger,

          speed:
            selectedHost.speed,

          access:
            selectedHost.access,

          route: {
            from:
              from,

            fromRegion:
              fromRegion,

            to:
              to,

            toRegion:
              toRegion,

            miles:
              routeInfo?.miles ?? null,

            hours:
              routeInfo?.hours ?? null,
          },

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      setBookingRequestId(
        ref.id
      );

      setRequestSent(
        true
      );
    } catch (err) {
      console.error(
        "Failed to create KIVO booking request:",
        err
      );

      setBookingRequestError(
        err instanceof Error
          ? err.message
          : "Could not send the charging request."
      );
    } finally {
      setBookingRequestLoading(
        false
      );
    }
  }

  function openHostFromResults(host: Host) {
    setSelectedHost(host);
    setRequestSent(false);
    setBookingRequestError("");
    setBookingRequestId(null);

    requestAnimationFrame(() => {
      mapContainer.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  async function publishHostListing() {
    setHostPublishError("");

    if (!user) {
      openAccountModal("host");
      return;
    }

    if (!hasRole("host")) {
      openAccountModal("host");
      return;
    }

    if (!db) {
      setHostPublishError(
        "KIVO database is not available."
      );
      return;
    }

    const rawLocation =
      hostForm.location.trim();

    if (!rawLocation) {
      setHostPublishError(
        "Enter the charger location."
      );
      return;
    }

    const locationParts =
      rawLocation
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

    const area =
      locationParts[0] || rawLocation;

    const region =
      locationParts.length > 1
        ? locationParts[
            locationParts.length - 1
          ].toUpperCase()
        : "";

    const price =
      Number(hostForm.price);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      setHostPublishError(
        "Enter a valid charging price."
      );
      return;
    }

    setHostPublishLoading(true);

    try {
      // Resolve the listing to real coordinates now
      // so it can later appear on the KIVO map.
      const coords =
        await geocode(
          area,
          region
        );

      const hostDocument = {
        ownerUid:
          user.uid,

        ownerEmail:
          user.email || "",

        status:
          "active",

        area,
        state:
          region,

        locationLabel:
          rawLocation,

        coords: {
          lng: coords[0],
          lat: coords[1],
        },

        charger: {
          level:
            "Level 2",

          connector:
            hostForm.connector,

          speed:
            hostForm.speed,
        },

        availability: {
          weekdays:
            hostForm.weekdays,

          weekends:
            hostForm.weekends,

          startTime:
            hostForm.startTime,

          endTime:
            hostForm.endTime,
        },

        pricing: {
          sessionPrice:
            price,

          currency:
            "USD",
        },

        access:
          hostForm.access,

        amenities:
          hostForm.amenities,

        rules:
          hostForm.rules.trim(),

        rating: null,
        reviews: 0,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      };

      const ref =
        await addDoc(
          collection(
            db,
            "hosts"
          ),
          hostDocument
        );

      setPublishedHostId(
        ref.id
      );

      await loadRealKivoHosts();

      setHostPublished(
        true
      );
    } catch (err) {
      console.error(
        "Failed to publish KIVO host:",
        err
      );

      setHostPublishError(
        err instanceof Error
          ? err.message
          : "Could not publish the KIVO host listing."
      );
    } finally {
      setHostPublishLoading(
        false
      );
    }
  }

  function toggleAmenity(amenity: string) {
    setHostForm((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((item) => item !== amenity)
        : [...current.amenities, amenity],
    }));
  }

  function resetHostDemo() {
    setHostMode(false);
    setHostStep(1);
    setHostPublished(false);
    setPublishedHostId(null);
    setHostPublishError("");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center">
            <img
              src="/kivo/kivo-wordmark.png"
              alt="KIVO — Charge somewhere better"
              className="h-32 w-auto object-contain sm:h-40 md:h-44"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={async () => {
                if (
                  !user ||
                  !hasRole("driver")
                ) {
                  openAccountModal("driver");
                  return;
                }

                await loadDriverRequests();
                setDriverInboxOpen(true);
              }}
              className="group rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-left transition hover:border-cyan-400/70 hover:bg-slate-900 sm:px-4 sm:py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400 sm:text-xs">
                KivoDriver
              </p>
              <p className="hidden text-xs text-slate-400 sm:block">
                Find a charger
              </p>
            </button>

            <button
              onClick={async () => {
                if (
                  !user ||
                  !hasRole("host")
                ) {
                  openAccountModal("host");
                  return;
                }

                await loadHostRequests();
                setHostInboxOpen(true);
              }}
              className="group rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-left transition hover:border-emerald-400/70 hover:bg-slate-900 sm:px-4 sm:py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400 sm:text-xs">
                KivoHost
              </p>
              <p className="hidden text-xs text-slate-400 sm:block">
                Share your charger
              </p>
            </button>
          </div>
        </div>
        {user && (
          <div className="border-t border-slate-800/60 bg-slate-950">
            <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-2 text-xs sm:px-6">
              <span className="text-slate-500">
                Signed in as
              </span>

              <span className="font-semibold text-slate-300">
                {user.email}
              </span>

              {accountTypes.map(
                (role) => (
                  <span
                    key={role}
                    className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 font-semibold uppercase tracking-wide text-emerald-400"
                  >
                    {role}
                  </span>
                )
              )}

              <button
                onClick={() => logout()}
                className="text-slate-500 transition hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <AccountModal
        open={accountModalOpen}
        initialRole={accountModalRole}
        onClose={() =>
          setAccountModalOpen(false)
        }
      />

      {driverInboxOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl sm:p-8">

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
                  KivoDriver
                </p>

                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                  My charging requests
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Follow the status of your KIVO charging sessions.
                </p>
              </div>

              <button
                onClick={() =>
                  setDriverInboxOpen(false)
                }
                className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-400 transition hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={loadDriverRequests}
                disabled={driverRequestsLoading}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-50"
              >
                {driverRequestsLoading
                  ? "Refreshing..."
                  : "Refresh requests"}
              </button>

              <button
                onClick={() => {
                  setDriverInboxOpen(false);

                  setTimeout(() => {
                    document
                      .getElementById(
                        "route-discovery"
                      )
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }, 50);
                }}
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
              >
                Find a charger
              </button>
            </div>

            {driverRequestsError && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {driverRequestsError}
              </div>
            )}

            {!driverRequestsLoading &&
              driverRequests.length === 0 && (
                <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                  <p className="font-semibold">
                    You don't have any charging requests yet.
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Find a KIVO Host and request your first charging session.
                  </p>
                </div>
              )}

            <div className="mt-6 space-y-4">
              {driverRequests.map(
                (request) => {
                  const accepted =
                    request.status ===
                    "accepted";

                  const declined =
                    request.status ===
                    "declined";

                  const completed =
                    request.status ===
                    "completed";

                  return (
                    <div
                      key={request.id}
                      className={`rounded-2xl border p-5 ${
                        accepted
                          ? "border-emerald-400/30 bg-emerald-500/5"
                          : declined
                          ? "border-red-400/30 bg-red-500/5"
                          : "border-amber-400/30 bg-amber-500/5"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">
                              {request.hostArea}
                              {request.hostState
                                ? `, ${request.hostState}`
                                : ""}
                            </h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                                accepted
                                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                  : declined
                                  ? "border-red-400/30 bg-red-400/10 text-red-300"
                                  : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                              }`}
                            >
                              {request.status}
                            </span>
                          </div>

                          <p
                            className={`mt-3 font-semibold ${
                              accepted
                                ? "text-emerald-300"
                                : declined
                                ? "text-red-300"
                                : "text-amber-300"
                            }`}
                          >
                            {completed
                              ? "Charging session completed ✓"
                              : accepted
                              ? "Your KIVO Host accepted your request ✓"
                              : declined
                              ? "The host declined this request"
                              : "Waiting for host approval"}
                          </p>

                          <p className="mt-2 text-sm text-slate-400">
                            Requested time:{" "}
                            <span className="font-semibold text-slate-200">
                              {request.requestedTime}
                            </span>
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-2xl font-bold">
                            ${request.price}
                          </p>

                          <p className="text-xs text-slate-500">
                            charging session
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                        <div className="rounded-xl bg-slate-950/70 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            Connector
                          </p>

                          <p className="mt-1 font-semibold">
                            {request.vehicleConnector}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-950/70 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            Charger
                          </p>

                          <p className="mt-1 font-semibold">
                            {request.charger}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-950/70 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            Route
                          </p>

                          <p className="mt-1 font-semibold">
                            {request.route?.from ||
                              "—"}
                            {request.route
                              ?.fromRegion
                              ? `, ${request.route.fromRegion}`
                              : ""}
                            {" → "}
                            {request.route?.to ||
                              "—"}
                            {request.route
                              ?.toRegion
                              ? `, ${request.route.toRegion}`
                              : ""}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-950/70 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            Request ID
                          </p>

                          <p className="mt-1 truncate font-mono text-xs text-slate-300">
                            {request.id}
                          </p>
                        </div>
                      </div>

                      {(accepted || completed) && (
                        <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400">
                            {completed
                              ? "SESSION COMPLETED"
                              : "SESSION CONFIRMED"}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            Your charging request has been accepted.
                          </p>

                          {request.privateAddress &&
                          request.arrivalInstructions ? (
                            <div className="mt-4 space-y-3">
                              <div className="rounded-xl border border-emerald-400/20 bg-slate-950/50 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                  Private charging address
                                </p>

                                <p className="mt-1 font-semibold text-white">
                                  {request.privateAddress}
                                </p>
                              </div>

                              <div className="rounded-xl border border-emerald-400/20 bg-slate-950/50 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                  Arrival instructions
                                </p>

                                <p className="mt-1 text-sm leading-6 text-slate-200">
                                  {request.arrivalInstructions}
                                </p>
                              </div>

                              <p className="text-xs text-slate-500">
                                These details are private and are shown only for your accepted KIVO session.
                              </p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-amber-300">
                              Waiting for the Host to provide private arrival details.
                            </p>
                          )}
                        </div>
                      )}

                      {declined && (
                        <button
                          onClick={() => {
                            setDriverInboxOpen(false);

                            setTimeout(() => {
                              document
                                .getElementById(
                                  "route-discovery"
                                )
                                ?.scrollIntoView({
                                  behavior:
                                    "smooth",
                                });
                            }, 50);
                          }}
                          className="mt-5 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold transition hover:border-emerald-400 hover:text-emerald-400"
                        >
                          Find another KIVO Host
                        </button>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}

      {hostInboxOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
                  KivoHost
                </p>

                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                  Incoming charging requests
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Review pending requests and accept or decline them.
                </p>
              </div>

              <button
                onClick={() => setHostInboxOpen(false)}
                className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-400 transition hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6 flex justify-between gap-3">
              <button
                onClick={loadHostRequests}
                disabled={hostRequestsLoading}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:border-emerald-400 hover:text-emerald-400 disabled:opacity-50"
              >
                {hostRequestsLoading
                  ? "Refreshing..."
                  : "Refresh requests"}
              </button>

              <button
                onClick={() => {
                  setHostInboxOpen(false);
                  setHostMode(true);
                  setHostStep(1);
                  setHostPublished(false);
                }}
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
              >
                Add another charger
              </button>
            </div>

            {hostRequestsError && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {hostRequestsError}
              </div>
            )}

            {!hostRequestsLoading &&
              hostRequests.length === 0 && (
                <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                  <p className="font-semibold">
                    No charging requests yet.
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Incoming driver requests will appear here.
                  </p>
                </div>
              )}

            <div className="mt-6 space-y-4">
              {hostRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">
                          {request.hostArea}
                          {request.hostState
                            ? `, ${request.hostState}`
                            : ""}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                            request.status === "pending"
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                              : request.status === "accepted"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              : request.status === "completed"
                              ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                              : "border-red-400/30 bg-red-400/10 text-red-300"
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        Driver: {request.driverEmail || "KIVO Driver"}
                      </p>

                      <p className="mt-1 text-sm text-slate-300">
                        Requested time:{" "}
                        <span className="font-semibold">
                          {request.requestedTime}
                        </span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-bold">
                        ${request.price}
                      </p>

                      <p className="text-xs text-slate-500">
                        charging session
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-slate-950/70 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Connector
                      </p>
                      <p className="mt-1 font-semibold">
                        {request.vehicleConnector}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-950/70 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Charger
                      </p>
                      <p className="mt-1 font-semibold">
                        {request.charger}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-950/70 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Route
                      </p>
                      <p className="mt-1 font-semibold">
                        {request.route?.from || "—"}
                        {request.route?.fromRegion
                          ? `, ${request.route.fromRegion}`
                          : ""}
                        {" → "}
                        {request.route?.to || "—"}
                        {request.route?.toRegion
                          ? `, ${request.route.toRegion}`
                          : ""}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-950/70 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Access
                      </p>
                      <p className="mt-1 font-semibold">
                        {request.access}
                      </p>
                    </div>
                  </div>

                  {request.status === "accepted" && (
                    <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400">
                          Confirmed session
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                          Share the private arrival information with this driver.
                        </p>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-300">
                            Private charging address
                          </label>

                          <input
                            type="text"
                            value={
                              arrivalDrafts[request.id]?.privateAddress ??
                              request.privateAddress ??
                              ""
                            }
                            onChange={(event) =>
                              updateArrivalDraft(
                                request,
                                "privateAddress",
                                event.target.value
                              )
                            }
                            placeholder="123 Example St, Katy, TX 77494"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-300">
                            Arrival instructions
                          </label>

                          <textarea
                            value={
                              arrivalDrafts[request.id]?.arrivalInstructions ??
                              request.arrivalInstructions ??
                              ""
                            }
                            onChange={(event) =>
                              updateArrivalDraft(
                                request,
                                "arrivalInstructions",
                                event.target.value
                              )
                            }
                            placeholder="Park on the left side of the driveway. The charger is beside the garage."
                            rows={3}
                            className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                          />
                        </div>

                        <button
                          onClick={() =>
                            saveArrivalDetails(request)
                          }
                          disabled={
                            arrivalSavingId === request.id
                          }
                          className="w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 font-bold text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-50"
                        >
                          {arrivalSavingId === request.id
                            ? "Saving..."
                            : request.privateAddress &&
                              request.arrivalInstructions
                            ? "Update arrival details"
                            : "Save arrival details"}
                        </button>

                        {request.privateAddress &&
                          request.arrivalInstructions && (
                            <div className="border-t border-slate-800 pt-4">
                              <button
                                onClick={() =>
                                  completeChargingSession(
                                    request
                                  )
                                }
                                disabled={
                                  sessionCompletingId ===
                                  request.id
                                }
                                className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                              >
                                {sessionCompletingId ===
                                request.id
                                  ? "Completing..."
                                  : "Complete charging session"}
                              </button>

                              <p className="mt-2 text-center text-xs text-slate-500">
                                Use this after the driver has finished charging.
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {request.status === "completed" && (
                    <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">
                        Session completed ✓
                      </p>

                      <p className="mt-2 text-sm text-slate-300">
                        This charging session is now part of your KIVO hosting history.
                      </p>
                    </div>
                  )}

                  {request.status === "pending" && (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() =>
                          updateHostRequestStatus(
                            request.id,
                            "accepted"
                          )
                        }
                        className="rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-300"
                      >
                        Accept request
                      </button>

                      <button
                        onClick={() =>
                          updateHostRequestStatus(
                            request.id,
                            "declined"
                          )
                        }
                        className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 font-bold text-red-300 transition hover:bg-red-400/20"
                      >
                        Decline request
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">
              Private EV charging marketplace
            </p>

            <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Private EV charging, along the route you&apos;re already driving.
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:mt-6 sm:text-lg sm:leading-8">
              Discover available Level 2 chargers from verified local hosts —
              with hosts controlling when, how, and under what rules their
              charger is available.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <button
                onClick={() => {
                  document
                    .getElementById("route-discovery")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full rounded-xl bg-emerald-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-emerald-300 sm:w-auto"
              >
                Find a charger
              </button>

              <button
                onClick={() => {
                  if (
                    !user ||
                    !hasRole("host")
                  ) {
                    openAccountModal("host");
                    return;
                  }

                  setHostMode(true);
                  setHostStep(1);
                  setHostPublished(false);
                  setPublishedHostId(null);
                  setHostPublishError("");
                }}
                className="w-full rounded-xl border border-slate-700 px-6 py-4 font-semibold transition hover:border-emerald-400 hover:text-emerald-400 sm:w-auto"
              >
                Become a host
              </button>
            </div>

            <div className="mt-6 hidden flex-wrap gap-3 text-sm text-slate-400 sm:flex lg:mt-8">
              <span className="rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2">
                Route-based discovery
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2">
                Level 2 home chargers
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2">
                Host-controlled availability
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
              How KIVO works
            </p>

            <div className="mt-6 space-y-5">
              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm font-semibold text-emerald-400">
                  01 · Plan your trip
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Enter where you&apos;re going and see private chargers close
                  to the route you&apos;re already taking.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm font-semibold text-emerald-400">
                  02 · Choose a host
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Compare detour time, charger type, price, availability,
                  amenities, and host rules.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm font-semibold text-emerald-400">
                  03 · Request your session
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Select a time and request access. The host stays in control of
                  every booking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800 bg-slate-900/20">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:py-20">

          <div className="grid overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 lg:grid-cols-2">
            <div className="relative min-h-[360px] overflow-hidden sm:min-h-[460px]">
              <img
                src="/kivo/driveway-host.png"
                alt="Home EV charger installed beside a residential driveway"
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-slate-950/75 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Capacity already exists
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-200">
                  Millions of hours of home charging capacity sit unused every day.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
                The KIVO idea
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Charging infrastructure doesn&apos;t always need to be built.
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-300">
                Sometimes it simply needs to become discoverable.
              </p>

              <p className="mt-4 leading-7 text-slate-400">
                KIVO explores a marketplace where homeowners can make existing
                Level 2 chargers available during the hours they choose — while
                drivers discover charging options close to trips they&apos;re
                already taking.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-2xl font-bold text-emerald-400">01</p>
                  <p className="mt-2 font-semibold">Existing chargers</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Use capacity already installed.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-2xl font-bold text-emerald-400">02</p>
                  <p className="mt-2 font-semibold">Host control</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Schedule, access and rules stay with the owner.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-2xl font-bold text-emerald-400">03</p>
                  <p className="mt-2 font-semibold">Route relevance</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Find options without unnecessary detours.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="order-2 flex flex-col justify-center p-7 sm:p-10 lg:order-1 lg:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
                A different kind of network
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                What if the charger you need is already nearby?
              </h2>

              <p className="mt-5 leading-7 text-slate-400">
                KIVO is not trying to replace public fast charging. It explores
                another layer of charging availability — privately owned Level 2
                chargers that could become useful when location, timing and
                convenience make sense.
              </p>

              <div className="mt-7 space-y-4">
                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-bold text-emerald-400">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold">Hosts choose availability</p>
                    <p className="mt-1 text-sm text-slate-500">
                      No open-ended access to someone&apos;s property.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-bold text-emerald-400">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold">Drivers see the detour first</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Distance and estimated time off-route are visible before requesting.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-bold text-emerald-400">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold">Each stop can be different</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Charger-only or optional amenities such as Wi-Fi, coffee or workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 relative min-h-[330px] overflow-hidden lg:order-2 lg:min-h-[520px]">
              <img
                src="/kivo/neighborhood-network.png"
                alt="Residential neighborhood representing nearby private EV charging hosts"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      <section
        id="route-discovery"
        className="mx-auto max-w-7xl scroll-mt-6 px-4 py-10 sm:px-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
          Route discovery
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Find charging along your trip
        </h1>

        <p className="mt-2 text-slate-400">
          See private Level 2 hosts near the route
          you&apos;re already driving.
        </p>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Try a KIVO demo route
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Major corridors and one intentionally remote destination.
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {demoTrips.map((trip) => (
              <button
                key={trip.label}
                type="button"
                onClick={() => {
                  const start =
                    splitPlaceRegion(trip.from);
                  const destination =
                    splitPlaceRegion(trip.to);

                  setFrom(start.place);
                  setFromRegion(start.region);
                  setTo(destination.place);
                  setToRegion(destination.region);

                  setRouteInfo(null);
                  setVisibleHosts([]);
                  setSelectedHost(null);
                }}
                className="shrink-0 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-left transition hover:border-emerald-400/60 hover:bg-slate-900"
              >
                <p className="text-sm font-semibold text-white">
                  {trip.label}
                </p>
                <p className={`mt-1 text-[11px] ${
                  trip.type === "Remote"
                    ? "text-amber-400"
                    : "text-slate-500"
                }`}>
                  {trip.type}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              FROM
            </label>

            <div className="mt-1 grid grid-cols-[1fr_110px] gap-2">
              <input
                value={from}
                onChange={(e) =>
                  setFrom(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    findRoute();
                }}
                placeholder="City, town, park..."
                className="min-w-0 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
              />

              <select
                value={fromRegion}
                onChange={(e) =>
                  setFromRegion(e.target.value)
                }
                aria-label="Origin state or province"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-emerald-400"
              >
                <option value="">State</option>

                {REGION_OPTIONS.map((group) => (
                  <optgroup
                    key={group.group}
                    label={group.group}
                  >
                    {group.options.map(
                      ([code, name]) => (
                        <option
                          key={code}
                          value={code}
                        >
                          {code}
                        </option>
                      )
                    )}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="hidden pb-3 text-slate-500 md:block">
            →
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">
              TO
            </label>

            <div className="mt-1 grid grid-cols-[1fr_110px] gap-2">
              <input
                value={to}
                onChange={(e) =>
                  setTo(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    findRoute();
                }}
                placeholder="City, town, park..."
                className="min-w-0 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
              />

              <select
                value={toRegion}
                onChange={(e) =>
                  setToRegion(e.target.value)
                }
                aria-label="Destination state or province"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-emerald-400"
              >
                <option value="">State</option>

                {REGION_OPTIONS.map((group) => (
                  <optgroup
                    key={group.group}
                    label={group.group}
                  >
                    {group.options.map(
                      ([code, name]) => (
                        <option
                          key={code}
                          value={code}
                        >
                          {code}
                        </option>
                      )
                    )}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={findRoute}
            disabled={loading}
            className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {loading
              ? "Finding..."
              : "Find KIVO hosts"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {routeInfo && (
          <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
              North America validation network
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Green pins include simulated KIVO hosts used to demonstrate how
              route and destination coverage could work across the U.S. and Canada.
            </p>
          </div>
        )}

        {routeInfo && (
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
              {routeInfo.miles} miles
            </span>

            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
              ~{routeInfo.hours} hrs
            </span>

            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-400">
              {visibleHosts.length} KIVO{" "}
              {visibleHosts.length === 1
                ? "host"
                : "hosts"}{" "}
              near this route
            </span>
          </div>
        )}

        <div className="relative mt-5">
          <div
            ref={mapContainer}
            className="h-[62vh] min-h-[430px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 sm:min-h-[520px]"
          />

          {selectedHost && (() => {
            const detour = getHostDetour(selectedHost);

            return (
              <div className="absolute bottom-3 left-3 right-3 z-10 max-h-[82%] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur sm:bottom-5 sm:left-5 sm:right-auto sm:w-[430px] sm:max-w-md sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                        {selectedHost.real
                          ? "KIVO HOST"
                          : selectedHost.simulated
                          ? "SIMULATED KIVO HOST"
                          : "SAMPLE KIVO HOST"}
                      </p>

                      {selectedHost.real &&
                        selectedHost.reviews === 0 && (
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                            New Host
                          </span>
                        )}
                    </div>

                    <h2 className="mt-1 text-2xl font-bold">
                      {selectedHost.area}
                      {selectedHost.state !== "KIVO Demo"
                        ? `, ${selectedHost.state}`
                        : ""}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Hosted by {selectedHost.hostName}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedHost(null);
                      setRequestSent(false);
                    }}
                    className="rounded-full border border-slate-700 px-3 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between border-y border-slate-800 py-4">
                  <div>
                    <p className="text-3xl font-bold">
                      ${selectedHost.price}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedHost.real
                        ? "charging session"
                        : "sample charging session"}
                    </p>
                  </div>

                  <div className="text-right">
                    {selectedHost.reviews > 0 ? (
                      <>
                        <p className="font-semibold">
                          ★ {selectedHost.rating}
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedHost.reviews}{" "}
                          {selectedHost.real ? "reviews" : "sample reviews"}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-cyan-300">
                          New Host
                        </p>
                        <p className="text-xs text-slate-500">
                          No reviews yet
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      selectedHost.coverage === "destination"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        : selectedHost.coverage === "detour"
                        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {selectedHost.coverage === "destination"
                      ? "Destination / remote coverage"
                      : selectedHost.coverage === "detour"
                      ? "Small detour"
                      : "Along your route"}
                  </span>
                </div>

                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <p className="text-xs font-semibold text-emerald-400">
                    ROUTE DETOUR
                  </p>
                  <p className="mt-1 font-semibold">
                    {detour.miles} miles · about {detour.minutes} min off route
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-900 p-3">
                    <p className="text-xs text-slate-500">CHARGER</p>
                    <p className="mt-1 font-semibold">
                      {selectedHost.charger}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-900 p-3">
                    <p className="text-xs text-slate-500">SPEED</p>
                    <p className="mt-1 font-semibold">
                      {selectedHost.speed}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-xl bg-slate-900 p-3">
                    <p className="text-xs text-slate-500">AVAILABLE</p>
                    <p className="mt-1 font-semibold text-emerald-400">
                      {selectedHost.availability}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-xl bg-slate-900 p-3">
                    <p className="text-xs text-slate-500">ACCESS</p>
                    <p className="mt-1 font-semibold">
                      {selectedHost.access}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500">
                    AMENITIES
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedHost.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                {!requestSent ? (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-500">
                          ARRIVAL TIME
                        </label>
                        <select
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-emerald-400"
                        >
                          <option>4:00 PM</option>
                          <option>5:00 PM</option>
                          <option>6:00 PM</option>
                          <option>7:00 PM</option>
                          <option>8:00 PM</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-500">
                          VEHICLE CONNECTOR
                        </label>
                        <select
                          value={vehicleConnector}
                          onChange={(e) => setVehicleConnector(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-emerald-400"
                        >
                          <option>NACS / Tesla</option>
                          <option>J1772</option>
                          <option>Adapter available</option>
                        </select>
                      </div>
                    </div>

                    {bookingRequestError && (
                      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {bookingRequestError}
                      </div>
                    )}

                    <button
                      onClick={requestChargingSession}
                      disabled={bookingRequestLoading}
                      className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {bookingRequestLoading
                        ? "Sending request..."
                        : `Request session for ${selectedTime}`}
                    </button>
                  </>
                ) : (
                  <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="font-semibold text-emerald-400">
                      Charging request sent ✓
                    </p>

                    {selectedHost.real ? (
                      <>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          Your request for {selectedTime} has been sent to this
                          KIVO Host. Connector: {vehicleConnector}.
                        </p>

                        <div className="mt-3 rounded-lg border border-emerald-400/20 bg-slate-950/40 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                            STATUS
                          </p>

                          <p className="mt-1 font-semibold text-amber-300">
                            Pending host approval
                          </p>
                        </div>

                        {bookingRequestId && (
                          <p className="mt-3 text-xs text-slate-500">
                            Request ID:{" "}
                            <span className="font-mono text-slate-400">
                              {bookingRequestId}
                            </span>
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {selectedHost.hostName} would now receive your request for{" "}
                          {selectedTime}. Connector: {vehicleConnector}.
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Validation demo — no real booking was created for this
                          sample host.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {routeInfo &&
          visibleHosts.length > 0 &&
          (() => {
            const {
              bestMatch,
              closest,
              bestValue,
              others,
            } = getFeaturedHosts();

            const featured = [
              {
                key: "best-match",
                label: "Best Match",
                subtitle: "Best overall balance",
                host: bestMatch,
                accent:
                  "border-emerald-400/40 bg-emerald-500/10",
                labelClass:
                  "text-emerald-400",
              },
              {
                key: "closest",
                label: "Closest",
                subtitle: "Lowest route detour",
                host: closest,
                accent:
                  "border-cyan-400/30 bg-cyan-500/5",
                labelClass:
                  "text-cyan-400",
              },
              {
                key: "best-value",
                label: "Best Value",
                subtitle: "Best price/time tradeoff",
                host: bestValue,
                accent:
                  "border-amber-400/30 bg-amber-500/5",
                labelClass:
                  "text-amber-400",
              },
            ].filter(
              (item) => item.host
            );

            return (
              <div className="mt-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
                      KivoDriver matches
                    </p>

                    <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                      Best charging options for your route
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
                      Three clear recommendations based on
                      route convenience, price, charging
                      speed and host quality.
                    </p>
                  </div>

                  <p className="text-sm text-slate-500">
                    {visibleHosts.length} KIVO hosts found
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {featured.map(
                    ({
                      key,
                      label,
                      subtitle,
                      host,
                      accent,
                      labelClass,
                    }) => {
                      if (!host) return null;

                      const detour =
                        getHostDetour(host);

                      return (
                        <div
                          key={key}
                          className={`rounded-2xl border p-5 ${accent}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p
                                className={`text-[10px] font-bold uppercase tracking-[0.18em] ${labelClass}`}
                              >
                                {label}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {subtitle}
                              </p>

                              {host.real && (
                                <span className="mt-3 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-400">
                                  Live KIVO Host
                                </span>
                              )}

                              <h3 className="mt-3 text-xl font-bold">
                                {host.area}
                                {host.state &&
                                host.state !==
                                  "KIVO Demo"
                                  ? `, ${host.state}`
                                  : ""}
                              </h3>

                              <p className="mt-1 text-sm text-slate-400">
                                Hosted by{" "}
                                {host.hostName}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-2xl font-bold">
                                ${host.price}
                              </p>

                              <p className="text-xs text-slate-500">
                                per session
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-slate-950/70 p-3">
                              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                                Detour
                              </p>

                              <p className="mt-1 font-semibold">
                                {detour.minutes} min
                              </p>

                              <p className="text-xs text-slate-500">
                                {detour.miles} mi
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-950/70 p-3">
                              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                                Rating
                              </p>

                              <p className="mt-1 font-semibold">
                                {host.reviews > 0
                                  ? `★ ${host.rating}`
                                  : "New"}
                              </p>

                              <p className="text-xs text-slate-500">
                                {host.reviews > 0
                                  ? `${host.reviews} reviews`
                                  : "No reviews yet"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-950/70 p-3">
                              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                                Charger
                              </p>

                              <p className="mt-1 text-sm font-semibold">
                                {host.charger.replace(
                                  "Level 2 · ",
                                  ""
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-950/70 p-3">
                              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                                Speed
                              </p>

                              <p className="mt-1 font-semibold text-emerald-400">
                                {host.speed}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {host.amenities
                              .slice(0, 3)
                              .map((amenity) => (
                                <span
                                  key={`${key}-${host.id}-${amenity}`}
                                  className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-300"
                                >
                                  {amenity}
                                </span>
                              ))}
                          </div>

                          <div className="mt-5 border-t border-slate-800 pt-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Available
                            </p>

                            <p className="mt-1 text-sm font-semibold text-emerald-400">
                              {host.availability}
                            </p>

                            <button
                              onClick={() =>
                                openHostFromResults(
                                  host
                                )
                              }
                              className="mt-4 w-full rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                            >
                              View host
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {others.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/40">
                    <button
                      onClick={() =>
                        setShowOtherOptions(
                          (current) =>
                            !current
                        )
                      }
                      className="flex w-full items-center justify-between px-5 py-4 text-left"
                    >
                      <div>
                        <p className="font-semibold">
                          Other KIVO options
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {others.length} more hosts near
                          this route
                        </p>
                      </div>

                      <span className="text-xl text-slate-400">
                        {showOtherOptions
                          ? "−"
                          : "+"}
                      </span>
                    </button>

                    {showOtherOptions && (
                      <div className="border-t border-slate-800">
                        {others.map(
                          (host) => {
                            const detour =
                              getHostDetour(
                                host
                              );

                            return (
                              <div
                                key={`other-${host.id}`}
                                className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <p className="font-semibold">
                                    {host.area}
                                    {host.state &&
                                    host.state !==
                                      "KIVO Demo"
                                      ? `, ${host.state}`
                                      : ""}
                                  </p>

                                  <p className="mt-1 text-sm text-slate-400">
                                    {host.reviews > 0
                                      ? `★ ${host.rating}`
                                      : "New"}
                                    {" · "}
                                    ${host.price}
                                    {" · "}
                                    {detour.minutes} min detour
                                    {" · "}
                                    {host.charger.replace(
                                      "Level 2 · ",
                                      ""
                                    )}
                                  </p>
                                </div>

                                <button
                                  onClick={() =>
                                    openHostFromResults(
                                      host
                                    )
                                  }
                                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:border-emerald-400 hover:text-emerald-400"
                                >
                                  View host
                                </button>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        {routeInfo &&
          visibleHosts.length === 0 && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
              No sample KIVO hosts are currently
              within 12 miles of this route.
            </div>
          )}

        <p className="mt-4 text-sm text-slate-500">
          Blue = origin · Orange = destination ·
          Green = sample/simulated KIVO coverage near your route or destination
        </p>
      </section>

      {hostMode && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950">
          <div className="min-h-screen">
            <header className="border-b border-slate-800 bg-slate-950">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div>
                  <p className="text-lg font-bold tracking-[0.2em] text-emerald-400">
                    KIVO HOST
                  </p>
                  <p className="text-xs text-slate-400">
                    Your charger. Your schedule. Your rules.
                  </p>
                </div>

                <button
                  onClick={resetHostDemo}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-900"
                >
                  Back to driver view
                </button>
              </div>
            </header>

            <section className="mx-auto max-w-6xl px-6 py-10">
              {!hostPublished ? (
                <>
                  <div className="mb-8 max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
                      Become a KIVO host
                    </p>

                    <h1 className="mt-2 text-4xl font-bold">
                      Put your charger to work.
                    </h1>

                    <p className="mt-3 text-lg leading-8 text-slate-400">
                      Make your Level 2 charger available only when you choose.
                      You control the schedule, price, access, and rules.
                    </p>
                  </div>

                  <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                    <p className="font-semibold text-emerald-400">
                      You&apos;re in control.
                    </p>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                      Your charger is only shown as available during the hours
                      you choose. Your exact residential address is not shown
                      publicly to people browsing KIVO.
                    </p>
                  </div>

                  <div className="mb-8 flex gap-2">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div
                        key={step}
                        className={`h-2 flex-1 rounded-full ${
                          step <= hostStep
                            ? "bg-emerald-400"
                            : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                      {hostStep === 1 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            Step 1 of 5
                          </p>

                          <h2 className="mt-2 text-2xl font-bold">
                            Tell us about your charger
                          </h2>

                          <div className="mt-6 grid gap-5 sm:grid-cols-2">
                            <div>
                              <label className="text-sm font-semibold text-slate-400">
                                Connector
                              </label>

                              <select
                                value={hostForm.connector}
                                onChange={(e) =>
                                  setHostForm({
                                    ...hostForm,
                                    connector: e.target.value,
                                  })
                                }
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                              >
                                <option>NACS / Tesla</option>
                                <option>J1772</option>
                                <option>Both / adapter available</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-semibold text-slate-400">
                                Charging speed
                              </label>

                              <select
                                value={hostForm.speed}
                                onChange={(e) =>
                                  setHostForm({
                                    ...hostForm,
                                    speed: e.target.value,
                                  })
                                }
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                              >
                                <option>7.7 kW</option>
                                <option>9.6 kW</option>
                                <option>11.5 kW</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {hostStep === 2 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            Step 2 of 5
                          </p>

                          <h2 className="mt-2 text-2xl font-bold">
                            Where is your charger?
                          </h2>

                          <p className="mt-2 text-sm text-slate-400">
                            For this demo we&apos;re using city-level location only.
                          </p>

                          <input
                            value={hostForm.location}
                            onChange={(e) =>
                              setHostForm({
                                ...hostForm,
                                location: e.target.value,
                              })
                            }
                            className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                          />

                          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                            Exact home address would be protected and disclosed
                            only at the appropriate stage of a confirmed booking.
                          </div>
                        </div>
                      )}

                      {hostStep === 3 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            Step 3 of 5
                          </p>

                          <h2 className="mt-2 text-2xl font-bold">
                            Choose when drivers can book
                          </h2>

                          <p className="mt-2 text-sm text-slate-400">
                            Your charger is unavailable to KIVO outside the
                            schedule you create.
                          </p>

                          <div className="mt-6 space-y-4">
                            <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
                              <span>
                                <span className="block font-semibold">
                                  Monday – Friday
                                </span>
                                <span className="text-sm text-slate-500">
                                  Make charger available on weekdays
                                </span>
                              </span>

                              <input
                                type="checkbox"
                                checked={hostForm.weekdays}
                                onChange={(e) =>
                                  setHostForm({
                                    ...hostForm,
                                    weekdays: e.target.checked,
                                  })
                                }
                                className="h-5 w-5"
                              />
                            </label>

                            <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
                              <span>
                                <span className="block font-semibold">
                                  Saturday – Sunday
                                </span>
                                <span className="text-sm text-slate-500">
                                  Make charger available on weekends
                                </span>
                              </span>

                              <input
                                type="checkbox"
                                checked={hostForm.weekends}
                                onChange={(e) =>
                                  setHostForm({
                                    ...hostForm,
                                    weekends: e.target.checked,
                                  })
                                }
                                className="h-5 w-5"
                              />
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="text-sm font-semibold text-slate-400">
                                  From
                                </label>

                                <select
                                  value={hostForm.startTime}
                                  onChange={(e) =>
                                    setHostForm({
                                      ...hostForm,
                                      startTime: e.target.value,
                                    })
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                                >
                                  <option>8:00 AM</option>
                                  <option>12:00 PM</option>
                                  <option>4:00 PM</option>
                                  <option>6:00 PM</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-sm font-semibold text-slate-400">
                                  Until
                                </label>

                                <select
                                  value={hostForm.endTime}
                                  onChange={(e) =>
                                    setHostForm({
                                      ...hostForm,
                                      endTime: e.target.value,
                                    })
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                                >
                                  <option>6:00 PM</option>
                                  <option>8:00 PM</option>
                                  <option>10:00 PM</option>
                                  <option>Midnight</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {hostStep === 4 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            Step 4 of 5
                          </p>

                          <h2 className="mt-2 text-2xl font-bold">
                            Set your price and access
                          </h2>

                          <div className="mt-6 grid gap-5 sm:grid-cols-2">
                            <div>
                              <label className="text-sm font-semibold text-slate-400">
                                Session price
                              </label>

                              <div className="mt-2 flex rounded-xl border border-slate-700 bg-slate-950">
                                <span className="px-4 py-3 text-slate-500">$</span>

                                <input
                                  value={hostForm.price}
                                  onChange={(e) =>
                                    setHostForm({
                                      ...hostForm,
                                      price: e.target.value,
                                    })
                                  }
                                  className="w-full bg-transparent py-3 pr-4 outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-semibold text-slate-400">
                                Parking / access
                              </label>

                              <select
                                value={hostForm.access}
                                onChange={(e) =>
                                  setHostForm({
                                    ...hostForm,
                                    access: e.target.value,
                                  })
                                }
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                              >
                                <option>Private driveway</option>
                                <option>Outdoor parking spot</option>
                                <option>Garage access</option>
                                <option>Curbside space</option>
                              </select>
                            </div>
                          </div>

                          <div className="mt-6">
                            <p className="text-sm font-semibold text-slate-400">
                              Amenities you choose to offer
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {[
                                "Wi-Fi",
                                "Restroom",
                                "Coffee",
                                "Workspace",
                                "Family friendly",
                                "Charger only",
                              ].map((amenity) => {
                                const active =
                                  hostForm.amenities.includes(amenity);

                                return (
                                  <button
                                    key={amenity}
                                    type="button"
                                    onClick={() => toggleAmenity(amenity)}
                                    className={`rounded-full border px-4 py-2 text-sm ${
                                      active
                                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-400"
                                        : "border-slate-700 text-slate-400"
                                    }`}
                                  >
                                    {active ? "✓ " : ""}
                                    {amenity}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {hostStep === 5 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            Step 5 of 5
                          </p>

                          <h2 className="mt-2 text-2xl font-bold">
                            Set your house rules
                          </h2>

                          <p className="mt-2 text-sm text-slate-400">
                            Drivers see these before requesting your charger.
                          </p>

                          <textarea
                            value={hostForm.rules}
                            onChange={(e) =>
                              setHostForm({
                                ...hostForm,
                                rules: e.target.value,
                              })
                            }
                            rows={6}
                            className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 leading-6 outline-none focus:border-emerald-400"
                          />

                          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                            <p className="text-sm font-semibold">
                              KIVO principle
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-400">
                              A driver&apos;s reservation does not grant access
                              beyond the parking and amenities you explicitly
                              choose to offer.
                            </p>
                          </div>
                        </div>
                      )}

                      {hostPublishError && (
                        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                          {hostPublishError}
                        </div>
                      )}

                      <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">
                        <button
                          onClick={() =>
                            hostStep === 1
                              ? resetHostDemo()
                              : setHostStep(hostStep - 1)
                          }
                          className="rounded-xl border border-slate-700 px-5 py-3 font-semibold"
                        >
                          {hostStep === 1 ? "Cancel" : "Back"}
                        </button>

                        {hostStep < 5 ? (
                          <button
                            onClick={() => setHostStep(hostStep + 1)}
                            className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950"
                          >
                            Continue
                          </button>
                        ) : (
                          <button
                            onClick={publishHostListing}
                            disabled={hostPublishLoading}
                            className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {hostPublishLoading
                              ? "Publishing..."
                              : "Publish KIVO listing"}
                          </button>
                        )}
                      </div>
                    </div>

                    <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                        Live preview
                      </p>

                      <h3 className="mt-3 text-2xl font-bold">
                        {hostForm.location}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        Hosted by you
                      </p>

                      <div className="mt-5 flex items-center justify-between border-y border-slate-800 py-4">
                        <div>
                          <p className="text-3xl font-bold">
                            ${hostForm.price || "0"}
                          </p>
                          <p className="text-xs text-slate-500">
                            per charging session
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold">New host</p>
                          <p className="text-xs text-slate-500">
                            No reviews yet
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3 text-sm">
                        <div className="rounded-xl bg-slate-950 p-3">
                          <p className="text-xs text-slate-500">CHARGER</p>
                          <p className="mt-1 font-semibold">
                            Level 2 · {hostForm.connector}
                          </p>
                          <p className="text-slate-400">{hostForm.speed}</p>
                        </div>

                        <div className="rounded-xl bg-slate-950 p-3">
                          <p className="text-xs text-slate-500">AVAILABLE</p>
                          <p className="mt-1 font-semibold text-emerald-400">
                            {hostForm.startTime} – {hostForm.endTime}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-950 p-3">
                          <p className="text-xs text-slate-500">ACCESS</p>
                          <p className="mt-1 font-semibold">
                            {hostForm.access}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {hostForm.amenities.map((amenity) => (
                          <span
                            key={amenity}
                            className="rounded-full border border-slate-700 px-3 py-1 text-xs"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </aside>
                  </div>
                </>
              ) : (
                <div className="mx-auto max-w-2xl py-16 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-3xl text-emerald-400">
                    ✓
                  </div>

                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
                    KIVO listing published
                  </p>

                  <h1 className="mt-3 text-4xl font-bold">
                    Your charger is now listed on KIVO.
                  </h1>

                  <p className="mt-4 text-lg leading-8 text-slate-400">
                    Your listing is now stored in the KIVO marketplace
                    and can be made available to eligible drivers during
                    the availability you selected.
                  </p>

                  {publishedHostId && (
                    <div className="mx-auto mt-6 max-w-xl rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
                      <span className="text-slate-400">
                        Listing ID:
                      </span>{" "}
                      <span className="font-mono text-emerald-400">
                        {publishedHostId}
                      </span>
                    </div>
                  )}

                  <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                          Verified KIVO Host
                        </p>
                        <h2 className="mt-1 text-2xl font-bold">
                          {hostForm.location}
                        </h2>
                      </div>

                      <p className="text-3xl font-bold">
                        ${hostForm.price}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-950 p-4">
                        Level 2 · {hostForm.connector}
                      </div>

                      <div className="rounded-xl bg-slate-950 p-4">
                        {hostForm.speed}
                      </div>

                      <div className="rounded-xl bg-slate-950 p-4 sm:col-span-2">
                        Available {hostForm.startTime} – {hostForm.endTime}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setHostPublished(false);
                        setHostStep(1);
                      }}
                      className="rounded-xl border border-slate-700 px-5 py-3 font-semibold"
                    >
                      Edit listing
                    </button>

                    <button
                      onClick={resetHostDemo}
                      className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950"
                    >
                      Return to KIVO
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

    </main>
  );
}
