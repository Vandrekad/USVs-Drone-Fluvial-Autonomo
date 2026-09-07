import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { BASE_LAT, BASE_LNG, MOCK_ROUTE_PTS } from "../lib/dashboard";

function pointPosition(point, height = 0) {
  return Cesium.Cartesian3.fromDegrees(point.lon, point.lat, height);
}

function addPoint(viewer, point, color, label, size = 10) {
  viewer.entities.add({
    position: pointPosition(point, 3),
    point: {
      pixelSize: size,
      color: Cesium.Color.fromCssColorString(color),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: label,
      font: "600 12px DM Sans, sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromCssColorString("#0f172a"),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -size),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

export function MapPanel({ telemetry, mission, path, onMapClick, isMobile }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const onMapClickRef = useRef(onMapClick);
  const hasInitialViewRef = useRef(false);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayer: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      skyBox: false,
      skyAtmosphere: false,
    });

    viewer.imageryLayers.addImageryProvider(
      new Cesium.OpenStreetMapImageryProvider({
        url: "https://tile.openstreetmap.org/",
      })
    );
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#dbeafe");
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#0f172a");
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;

    const clickHandler = (movement) => {
      const ray = viewer.camera.getPickRay(movement.position);
      const cartesian = ray && viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) {
        return;
      }

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      onMapClickRef.current?.(
        Cesium.Math.toDegrees(cartographic.latitude),
        Cesium.Math.toDegrees(cartographic.longitude)
      );
    };

    viewer.screenSpaceEventHandler.setInputAction(clickHandler, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    const routePoints = mission?.route?.points?.length ? mission.route.points : MOCK_ROUTE_PTS;
    const pathPoints = path?.length ? path : [];
    const activeLeg = mission?.route?.active_leg ?? 0;
    const dronePosition = telemetry?.position || { lat: BASE_LAT, lon: BASE_LNG };

    viewer.entities.removeAll();

    if (routePoints.length > 1) {
      viewer.entities.add({
        polyline: {
          positions: routePoints.map((point) => pointPosition(point, 2)),
          width: 4,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString("#60a5fa").withAlpha(0.85),
            dashLength: 16,
          }),
          clampToGround: true,
        },
      });
    }

    if (pathPoints.length > 1) {
      viewer.entities.add({
        polyline: {
          positions: pathPoints.map((point) => pointPosition(point, 4)),
          width: 5,
          material: Cesium.Color.fromCssColorString("#1d4ed8").withAlpha(0.95),
          clampToGround: true,
        },
      });
    }

    routePoints.forEach((point, index) => {
      const completed = index < activeLeg;
      const current = index === activeLeg;
      addPoint(viewer, point, completed ? "#10b981" : current ? "#2563eb" : "#94a3b8", `${index + 1}`, current ? 12 : 9);
    });

    if (mission?.target) {
      addPoint(viewer, mission.target, "#8b5cf6", "Destino", 13);
    }

    viewer.entities.add({
      name: "USV-AM",
      position: pointPosition(dronePosition, 14),
      point: {
        pixelSize: 16,
        color: Cesium.Color.fromCssColorString("#2563eb"),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `USV-AM ${Math.round(telemetry?.position?.heading ?? 0)}°`,
        font: "700 13px DM Sans, sans-serif",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.fromCssColorString("#0f172a"),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    if (!hasInitialViewRef.current) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(dronePosition.lon, dronePosition.lat, 1800),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-55),
          roll: 0,
        },
        duration: 0.6,
      });
      hasInitialViewRef.current = true;
    }
  }, [mission, path, telemetry]);

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)" }}>
      <div ref={containerRef} style={{ width: "100%", height: isMobile ? "clamp(250px, 46vh, 340px)" : "clamp(360px, 62vh, 640px)" }} />
      <div style={{ position: "absolute", bottom: isMobile ? 8 : 10, right: isMobile ? 8 : 10, background: "rgba(15,23,42,0.82)", color: "#e2e8f0", borderRadius: 8, padding: isMobile ? "5px 7px" : "7px 10px", fontSize: isMobile ? 9 : 10, display: "flex", gap: isMobile ? 8 : 12, flexWrap: "wrap", maxWidth: isMobile ? "72%" : "none" }}>
        {[["#2563eb", "Veiculo"], ["#60a5fa", "Rota"], ["#10b981", "Pontos"], ["#8b5cf6", "Destino"]].map(([color, label]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} /> {label}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: isMobile ? 8 : 10, left: isMobile ? 8 : 10, background: "rgba(255,255,255,0.9)", borderRadius: 6, padding: isMobile ? "3px 6px" : "4px 9px", fontSize: isMobile ? 9 : 10, color: "#334155", maxWidth: isMobile ? "42%" : "none" }}>
        Clique no globo para definir destino
      </div>
    </div>
  );
}
