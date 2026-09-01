"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import type {
  Feature,
  LineString,
} from "geojson";

import {
  FormEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import {
  useAuth,
} from "@/context/AuthContext";

import KivoDriverShell from "@/components/driver/KivoDriverShell";

import {
  db,
} from "@/lib/firebase";

import {
  MarketplaceHost,
  discoverHostsForRoute,
  getHostDetour,
  rankHosts,
} from "@/lib/marketplace/driverDiscovery";


type RouteInfo = {
  miles: number;
  hours: number;
};


function DriverFindPageContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    user,
    loading: authLoading,
    hasRole,
  } = useAuth();


  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!hasRole("driver")) {
      router.replace("/account");
    }
  }, [
    authLoading,
    user,
    hasRole,
    router,
  ]);


  /* =========================================================
     DRIVER
  ========================================================= */

  /* =========================================================
     TRIP STATE
  ========================================================= */

  const initialFrom =
    searchParams.get("from") || "";

  const initialTo =
    searchParams.get("to") || "";

  const [from, setFrom] =
    useState(initialFrom);

  const [to, setTo] =
    useState(initialTo);

  const [routeInfo, setRouteInfo] =
    useState<RouteInfo | null>(
      null
    );

  const [
    routeCoordinates,
    setRouteCoordinates,
  ] =
    useState<number[][]>([]);

  const [
    marketplaceHosts,
    setMarketplaceHosts,
  ] =
    useState<MarketplaceHost[]>(
      []
    );

  const [
    visibleHosts,
    setVisibleHosts,
  ] =
    useState<MarketplaceHost[]>(
      []
    );

  const [
    selectedHostId,
    setSelectedHostId,
  ] =
    useState<number | null>(
      null
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(
        now.getMonth() + 1
      ).padStart(2, "0");
      const day = String(
        now.getDate()
      ).padStart(2, "0");

      return `${year}-${month}-${day}`;
    });

  const [
    selectedTime,
    setSelectedTime,
  ] =
    useState("6:00 PM");

  const [
    vehicleConnector,
    setVehicleConnector,
  ] =
    useState("J1772");

  const [
    bookingRequestLoading,
    setBookingRequestLoading,
  ] =
    useState(false);

  const [
    bookingRequestError,
    setBookingRequestError,
  ] =
    useState("");

  const [
    bookingRequestId,
    setBookingRequestId,
  ] =
    useState<string | null>(
      null
    );

  const [
    routeLoading,
    setRouteLoading,
  ] =
    useState(false);

  const [
    hostLoading,
    setHostLoading,
  ] =
    useState(true);

  const [error, setError] =
    useState("");

  const driverAuthorized =
    !authLoading &&
    !!user &&
    hasRole("driver");


  /* =========================================================
     MAP
  ========================================================= */

  const mapContainer =
    useRef<HTMLDivElement | null>(
      null
    );

  const mapRef =
    useRef<mapboxgl.Map | null>(
      null
    );

  const markerRefs =
    useRef<mapboxgl.Marker[]>([]);

  const endpointMarkers =
    useRef<mapboxgl.Marker[]>([]);

  const [mapReady, setMapReady] =
    useState(false);


  useEffect(() => {
    if (
      !driverAuthorized ||
      !mapContainer.current ||
      mapRef.current
    ) {
      return;
    }

    const token =
      process.env
        .NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      setError(
        "Mapbox token is missing."
      );
      return;
    }

    mapboxgl.accessToken =
      token;

    const map =
      new mapboxgl.Map({
        container:
          mapContainer.current,

        style:
          "mapbox://styles/mapbox/light-v11",

        center: [
          -96.2,
          31,
        ],

        zoom: 5.5,
      });

    map.addControl(
      new mapboxgl.NavigationControl(),
      "top-right"
    );

    const resizeMap = () => {
      map.resize();
    };

    const resizeObserver =
      new ResizeObserver(() => {
        resizeMap();
      });

    resizeObserver.observe(
      mapContainer.current
    );

    map.on(
      "load",
      () => {
        map.resize();

        requestAnimationFrame(() => {
          map.resize();
        });

        setTimeout(() => {
          map.resize();
        }, 150);

        setMapReady(true);
      }
    );

    map.on(
      "click",
      () => {
        setSelectedHostId(null);
      }
    );

    mapRef.current =
      map;

    requestAnimationFrame(() => {
      map.resize();
    });

    return () => {
      resizeObserver.disconnect();
      markerRefs.current.forEach(
        (marker) =>
          marker.remove()
      );

      endpointMarkers.current.forEach(
        (marker) =>
          marker.remove()
      );

      map.remove();

      mapRef.current =
        null;
    };
  }, [driverAuthorized]);


  /* =========================================================
     FIRESTORE HOSTS
  ========================================================= */

  useEffect(() => {
    async function loadHosts() {
      if (!db) {
        setMarketplaceHosts([]);
        setHostLoading(false);
        return;
      }

      try {
        const snapshot =
          await getDocs(
            collection(
              db,
              "hosts"
            )
          );

        const hosts:
          MarketplaceHost[] =
          [];

        for (
          const documentSnapshot
          of snapshot.docs
        ) {
          const data =
            documentSnapshot.data();

          if (
            data?.status !==
            "active"
          ) {
            continue;
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
            !Number.isFinite(
              lng
            ) ||
            !Number.isFinite(
              lat
            )
          ) {
            continue;
          }

          let numericId =
            0;

          for (
            const character
            of documentSnapshot.id
          ) {
            numericId =
              (
                numericId *
                  31 +
                character.charCodeAt(
                  0
                )
              ) %
              1000000000;
          }

          const sessionPrice =
            Number(
              data?.pricing
                ?.sessionPrice ??
                0
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

          hosts.push({
            id:
              -Math.max(
                1,
                numericId
              ),

            firestoreId:
              documentSnapshot.id,

            ownerUid:
              String(
                data?.ownerUid ||
                  ""
              ),

            real: true,
            simulated: false,

            area:
              String(
                data?.area ||
                  data?.locationLabel ||
                  "KIVO Host"
              ),

            state:
              String(
                data?.state ||
                  ""
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
                      amenity:
                        unknown
                    ): amenity is string =>
                      typeof amenity ===
                      "string"
                  )
                : [],

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
              typeof data?.hostPublicName ===
                "string" &&
              data.hostPublicName.trim()
                ? data.hostPublicName.trim()
                : "KIVO Host",

            hostBio:
              typeof data?.hostBio ===
              "string"
                ? data.hostBio.trim()
                : "",

            coverage:
              "corridor",
          });
        }

        setMarketplaceHosts(
          hosts
        );

        console.log(
          `✓ KivoDriver loaded ${hosts.length} active marketplace Host(s)`
        );
      } catch (loadError) {
        console.error(
          "Failed to load KIVO Hosts:",
          loadError
        );

        setError(
          "KIVO Hosts could not be loaded."
        );
      } finally {
        setHostLoading(false);
      }
    }

    void loadHosts();
  }, []);


  /* =========================================================
     MAPBOX GEOCODING
  ========================================================= */

  async function geocode(
    place: string
  ): Promise<
    [number, number]
  > {
    const token =
      process.env
        .NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      throw new Error(
        "Mapbox token is missing."
      );
    }

    const cleanPlace =
      place.trim();

    if (!cleanPlace) {
      throw new Error(
        "Enter both a starting point and destination."
      );
    }

    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(cleanPlace)}.json` +
      `?access_token=${token}` +
      `&limit=1` +
      `&country=US,CA` +
      `&types=place,locality,district,poi,address`;

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        "Location search is temporarily unavailable."
      );
    }

    const data =
      await response.json();

    if (
      !data.features?.length
    ) {
      throw new Error(
        `Could not find "${cleanPlace}".`
      );
    }

    return data
      .features[0]
      .center as [
        number,
        number,
      ];
  }


  /* =========================================================
     MARKERS
  ========================================================= */

  function clearHostMarkers() {
    markerRefs.current.forEach(
      (marker) =>
        marker.remove()
    );

    markerRefs.current =
      [];
  }


  function renderHostMarkers(
    hosts: MarketplaceHost[]
  ) {
    const map =
      mapRef.current;

    if (!map) return;

    clearHostMarkers();

    hosts.forEach(
      (host) => {
        const marker =
          new mapboxgl.Marker({
            color:
              "#0891b2",
            scale: 1.15,
          })
            .setLngLat(
              host.coords
            )
            .addTo(map);

        const element =
          marker.getElement();

        element.style.cursor =
          "pointer";

        element.setAttribute(
          "title",
          `${host.hostName} · ${host.area}`
        );

        element.addEventListener(
          "click",
          (event) => {
            event.stopPropagation();

            setSelectedHostId(
              host.id
            );
          }
        );

        markerRefs.current.push(
          marker
        );
      }
    );
  }


  /* =========================================================
     ROUTE SEARCH
  ========================================================= */

  async function findRoute(
    routeFrom = from,
    routeTo = to
  ) {
    const token =
      process.env
        .NEXT_PUBLIC_MAPBOX_TOKEN;

    const map =
      mapRef.current;

    if (
      !token ||
      !map ||
      !mapReady
    ) {
      return;
    }

    if (
      !routeFrom.trim() ||
      !routeTo.trim()
    ) {
      setError(
        "Enter both a starting point and destination."
      );

      return;
    }

    try {
      setRouteLoading(true);
      setError("");
      setSelectedHostId(null);
      setRouteInfo(null);

      const start =
        await geocode(
          routeFrom
        );

      const destination =
        await geocode(
          routeTo
        );

      const directionsUrl =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${start[0]},${start[1]};${destination[0]},${destination[1]}` +
        `?geometries=geojson&overview=full&access_token=${token}`;

      const response =
        await fetch(
          directionsUrl
        );

      const data =
        await response.json();

      if (
        !data.routes?.length
      ) {
        throw new Error(
          "No driving route could be found."
        );
      }

      const route =
        data.routes[0];

      const geojson:
        Feature<LineString> =
        {
          type: "Feature",

          properties: {},

          geometry:
            route.geometry,
        };

      if (
        map.getSource(
          "kivodriver-route"
        )
      ) {
        (
          map.getSource(
            "kivodriver-route"
          ) as mapboxgl.GeoJSONSource
        ).setData(
          geojson
        );
      } else {
        map.addSource(
          "kivodriver-route",
          {
            type: "geojson",
            data: geojson,
          }
        );

        map.addLayer({
          id:
            "kivodriver-route-line",

          type:
            "line",

          source:
            "kivodriver-route",

          layout: {
            "line-join":
              "round",

            "line-cap":
              "round",
          },

          paint: {
            "line-color":
              "#0891b2",

            "line-width":
              5,

            "line-opacity":
              0.9,
          },
        });
      }


      endpointMarkers.current.forEach(
        (marker) =>
          marker.remove()
      );

      endpointMarkers.current =
        [];

      const startMarker =
        new mapboxgl.Marker({
          color:
            "#2563eb",

          scale:
            1.05,
        })
          .setLngLat(start)
          .addTo(map);

      const endMarker =
        new mapboxgl.Marker({
          color:
            "#10b981",

          scale:
            1.05,
        })
          .setLngLat(
            destination
          )
          .addTo(map);

      endpointMarkers.current =
        [
          startMarker,
          endMarker,
        ];


      const coordinates =
        route.geometry
          .coordinates as number[][];

      setRouteCoordinates(
        coordinates
      );


      const discoveredHosts =
        discoverHostsForRoute({
          hosts:
            marketplaceHosts,

          routeCoordinates:
            coordinates,

          destination,
        });

      const rankedHosts =
        rankHosts(
          discoveredHosts,
          coordinates
        );

      setVisibleHosts(
        rankedHosts
      );

      renderHostMarkers(
        rankedHosts
      );


      const bounds =
        new mapboxgl
          .LngLatBounds();

      coordinates.forEach(
        (
          coordinate:
            number[]
        ) => {
          bounds.extend([
            coordinate[0],
            coordinate[1],
          ]);
        }
      );

      map.fitBounds(
        bounds,
        {
          padding: 60,
          duration: 800,
        }
      );


      setRouteInfo({
        miles:
          Math.round(
            route.distance /
              1609.344
          ),

        hours:
          Math.round(
            (
              route.duration /
              3600
            ) *
              10
          ) / 10,
      });
    } catch (
      routeError
    ) {
      console.error(
        routeError
      );

      setVisibleHosts([]);

      clearHostMarkers();

      setError(
        routeError instanceof
          Error
          ? routeError.message
          : "The route could not be calculated."
      );
    } finally {
      setRouteLoading(false);
    }
  }


  /* =========================================================
     AUTO-RUN ROUTE FROM DRIVER HOME
  ========================================================= */

  const initialSearchStarted =
    useRef(false);

  useEffect(() => {
    if (
      initialSearchStarted.current ||
      !mapReady ||
      hostLoading ||
      !initialFrom ||
      !initialTo
    ) {
      return;
    }

    initialSearchStarted.current =
      true;

    void findRoute(
      initialFrom,
      initialTo
    );
  }, [
    mapReady,
    hostLoading,
    initialFrom,
    initialTo,
  ]);


  /* =========================================================
     CHANGE TRIP INSIDE FIND
  ========================================================= */

  function handleSearch(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !from.trim() ||
      !to.trim()
    ) {
      setError(
        "Enter both a starting point and destination."
      );

      return;
    }

    const params =
      new URLSearchParams();

    params.set(
      "from",
      from.trim()
    );

    params.set(
      "to",
      to.trim()
    );

    router.replace(
      `/driver/find?${params.toString()}`,
      {
        scroll: false,
      }
    );

    void findRoute(
      from.trim(),
      to.trim()
    );
  }


  /* =========================================================
     AUTH LOADING
  ========================================================= */

  if (
    authLoading ||
    !user ||
    !hasRole("driver")
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">

        <div className="text-center">

          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700">
            KivoDriver
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Opening your Driver workspace...
          </p>

        </div>

      </main>
    );
  }


  /* =========================================================
     UI
  ========================================================= */


  async function requestChargingSession(
    host: MarketplaceHost
  ) {
    if (!user || !host.firestoreId) {
      setBookingRequestError(
        "This Host cannot receive booking requests right now."
      );
      return;
    }

    setBookingRequestLoading(true);
    setBookingRequestError("");
    setBookingRequestId(null);

    try {
      const idToken =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/bookings/create",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              hostListingId:
                host.firestoreId,

              requestedDate:
                selectedDate,

              requestedTime:
                selectedTime,

              vehicleConnector,

              hostArea:
                host.area,

              hostState:
                host.state,

              price:
                host.price,

              charger:
                host.charger,

              speed:
                host.speed,

              access:
                host.access,

              route: {
                from,
                to,
                miles:
                  routeInfo?.miles ??
                  null,
                hours:
                  routeInfo?.hours ??
                  null,
              },
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        if (data?.setupRequired) {
          router.push(
            "/driver/setup"
          );
          return;
        }

        throw new Error(
          data?.error ||
            "Could not send the charging request."
        );
      }

      setBookingRequestId(
        String(
          data.bookingRequestId ||
            ""
        )
      );
    } catch (err) {
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


  return (
    <KivoDriverShell active="find">

      {/* TRIP SEARCH */}

      <section className="border-b border-slate-200 bg-white">

        <form
          onSubmit={
            handleSearch
          }
          className="mx-auto flex max-w-[1500px] flex-col gap-3 px-5 py-4 sm:px-7 lg:flex-row lg:items-end"
        >

          <div className="min-w-0 flex-1">

            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Starting point
            </label>

            <input
              value={from}
              onChange={(
                event
              ) =>
                setFrom(
                  event.target.value
                )
              }
              placeholder="Houston, TX"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-cyan-500 focus:bg-white"
            />

          </div>


          <div className="min-w-0 flex-1">

            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Destination
            </label>

            <input
              value={to}
              onChange={(
                event
              ) =>
                setTo(
                  event.target.value
                )
              }
              placeholder="Dallas, TX"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-cyan-500 focus:bg-white"
            />

          </div>


          <button
            type="submit"
            disabled={
              routeLoading
            }
            className="rounded-xl bg-cyan-600 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-wait disabled:opacity-60"
          >
            {routeLoading
              ? "Finding..."
              : "Find chargers"}
          </button>

        </form>

      </section>


      {/* ROUTE SUMMARY */}

      <section className="mx-auto max-w-[1500px] px-5 pt-6 sm:px-7">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">
              Your trip
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">

              {from ||
                "Starting point"}

              <span className="mx-3 font-medium text-slate-300">
                →
              </span>

              {to ||
                "Destination"}

            </h1>

          </div>


          {routeInfo && (
            <div className="flex gap-2">

              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600">
                {routeInfo.miles} miles
              </span>

              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600">
                {routeInfo.hours} hrs
              </span>

              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700">
                {visibleHosts.length} KIVO Host{visibleHosts.length === 1 ? "" : "s"}
              </span>

            </div>
          )}

        </div>


        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

      </section>


      {/* MARKETPLACE */}

      <section className="mx-auto max-w-[1500px] px-5 pb-10 pt-5 sm:px-7">

        <div className="grid min-h-[650px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.65fr)]">


          {/* MAP */}

          <div className="relative h-[500px] border-b border-slate-200 lg:h-[650px] lg:border-b-0 lg:border-r">

            <div
              ref={
                mapContainer
              }
              className="h-full w-full"
            />


            {(routeLoading ||
              hostLoading) && (
              <div className="pointer-events-none absolute left-5 top-5 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-md">

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">
                  KivoDriver
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800">
                  {hostLoading
                    ? "Loading Hosts..."
                    : "Finding your route..."}
                </p>

              </div>
            )}

          </div>


          {/* RESULTS */}

          <aside className="min-w-0 bg-white">

            <div className="border-b border-slate-100 px-6 py-6">

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">
                KIVO Hosts
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Along your route
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ranked first by route convenience, then charging experience.
              </p>

            </div>


            <div className="max-h-[570px] space-y-4 overflow-y-auto p-5">

              {!routeInfo &&
                !routeLoading && (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">

                    <p className="font-bold text-slate-700">
                      Where are you going?
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Enter your trip above and KIVO will find active Hosts along your drive.
                    </p>

                  </div>
                )}


              {routeInfo &&
                visibleHosts.length ===
                  0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">

                    <p className="font-bold text-slate-700">
                      No KIVO Hosts found along this route yet.
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      KIVO only shows active marketplace Hosts here.
                    </p>

                  </div>
                )}


              {visibleHosts.map(
                (
                  host,
                  index
                ) => {
                  const detour =
                    getHostDetour(
                      host,
                      routeCoordinates
                    );

                  const selected =
                    selectedHostId ===
                    host.id;

                  return (
                    <div
                      key={
                        host.firestoreId ||
                        host.id
                      }
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedHostId(
                          host.id
                        );

                        mapRef.current
                          ?.flyTo({
                            center:
                              host.coords,

                            zoom: 11,

                            duration:
                              600,
                          });
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();

                          setSelectedHostId(
                            host.id
                          );

                          mapRef.current
                            ?.flyTo({
                              center:
                                host.coords,

                              zoom: 11,

                              duration:
                                600,
                            });
                        }
                      }}
                      className={`w-full cursor-pointer rounded-2xl border p-5 text-left transition ${
                        selected
                          ? "border-cyan-400 bg-cyan-50/60 shadow-sm"
                          : "border-slate-200 bg-white hover:border-cyan-300 hover:shadow-sm"
                      }`}
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          {index ===
                            0 && (
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                              Best match
                            </p>
                          )}

                          <h3 className="mt-1 truncate text-lg font-black">
                            {host.hostName}
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {host.area}
                          </p>

                        </div>


                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 font-black text-cyan-700">
                          ⚡
                        </div>

                      </div>


                      <div className="mt-4 flex flex-wrap gap-2">

                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                          {detour.miles} mi detour
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                          ~{detour.minutes} min
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                          {host.charger}
                        </span>

                      </div>


                      <div className="mt-4 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">

                        <div>

                          <p className="text-xs text-slate-400">
                            Charging speed
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-700">
                            {host.speed}
                          </p>

                        </div>


                        <div className="text-right">

                          <p className="text-xs text-slate-400">
                            Session
                          </p>

                          <p className="mt-1 text-sm font-black text-slate-950">
                            {host.price > 0
                              ? `$${host.price}`
                              : "Pricing not enabled"}
                          </p>

                        </div>

                      </div>


                      {selected && (
                        <div
                          className="mt-5 border-t border-cyan-100 pt-5"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >

                          {host.amenities.length >
                            0 && (
                            <div className="flex flex-wrap gap-2">

                              {host.amenities.map(
                                (
                                  amenity
                                ) => (
                                  <span
                                    key={
                                      amenity
                                    }
                                    className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold text-cyan-800"
                                  >
                                    {amenity}
                                  </span>
                                )
                              )}

                            </div>
                          )}


                          <div className="mt-5 rounded-2xl bg-slate-50 p-4">

                            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                              Request this charger
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              Choose your charging date, expected arrival time, and confirm your vehicle connector.
                            </p>


                            <div className="mt-4 grid gap-3 sm:grid-cols-3">

                              <label className="block">

                                <span className="text-xs font-bold text-slate-500">
                                  Charging date
                                </span>

                                <input
                                  type="date"
                                  value={
                                    selectedDate
                                  }
                                  min={(() => {
                                    const now =
                                      new Date();

                                    const year =
                                      now.getFullYear();

                                    const month =
                                      String(
                                        now.getMonth() +
                                          1
                                      ).padStart(
                                        2,
                                        "0"
                                      );

                                    const day =
                                      String(
                                        now.getDate()
                                      ).padStart(
                                        2,
                                        "0"
                                      );

                                    return `${year}-${month}-${day}`;
                                  })()}
                                  onChange={(
                                    event
                                  ) =>
                                    setSelectedDate(
                                      event.target
                                        .value
                                    )
                                  }
                                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-400"
                                />

                              </label>


                              <label className="block">

                                <span className="text-xs font-bold text-slate-500">
                                  Expected arrival
                                </span>

                                <select
                                  value={
                                    selectedTime
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setSelectedTime(
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-400"
                                >
                                  <option>
                                    4:00 PM
                                  </option>
                                  <option>
                                    5:00 PM
                                  </option>
                                  <option>
                                    6:00 PM
                                  </option>
                                  <option>
                                    7:00 PM
                                  </option>
                                  <option>
                                    8:00 PM
                                  </option>
                                </select>

                              </label>


                              <label className="block">

                                <span className="text-xs font-bold text-slate-500">
                                  Vehicle connector
                                </span>

                                <select
                                  value={
                                    vehicleConnector
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setVehicleConnector(
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-400"
                                >
                                  <option>
                                    J1772
                                  </option>
                                  <option>
                                    NACS / Tesla
                                  </option>
                                  <option>
                                    CCS1
                                  </option>
                                </select>

                              </label>

                            </div>


                            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">

                              <p className="text-xs font-bold text-slate-400">
                                Location privacy
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                Exact property address and arrival instructions are shared only after the Host accepts your request.
                              </p>

                            </div>


                            {bookingRequestError && (
                              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                {
                                  bookingRequestError
                                }
                              </p>
                            )}


                            {bookingRequestId ? (
                              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">

                                <p className="font-black text-emerald-800">
                                  Request sent
                                </p>

                                <p className="mt-1 text-sm leading-6 text-emerald-700">
                                  Waiting for {
                                    host.hostName
                                  } to respond.
                                </p>

                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={
                                  bookingRequestLoading
                                }
                                onClick={() =>
                                  requestChargingSession(
                                    host
                                  )
                                }
                                className="mt-4 w-full rounded-xl bg-cyan-500 px-5 py-3.5 text-sm font-black text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {bookingRequestLoading
                                  ? "Sending request..."
                                  : "Request to Charge"}
                              </button>
                            )}

                          </div>

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>

          </aside>

        </div>

      </section>


    </KivoDriverShell>

  );
}

export default function DriverFindPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
          <p className="text-sm font-bold text-slate-500">
            Loading KivoDriver...
          </p>
        </main>
      }
    >
      <DriverFindPageContent />
    </Suspense>
  );
}
