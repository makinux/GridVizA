# 3D Animation of Time-Series Data

This application visualizes time-series Geotiff data as animated color and height changes on a glTF model in the Cesium globe.

## Features

- Time-series playback synchronized with Cesium timeline
- Linear interpolation between consecutive Geotiff frames
- Sample preset selection from UI (`Sample preset` dropdown)
- URL preset switching with query parameter (`?sample=<preset_key>`)
- Auto-loop playback speed normalized to about 10 seconds per full timeline
- FPS display enabled (Cesium debug FPS counter)

## Included sample datasets

The repository currently includes these sample datasets:

- `htdocs/data/sample_graphcast`
  - Global pressure forecast data (GraphCast, Dec 2023)
- `htdocs/data/sample_202308`
  - Typhoon 7 pressure/rain data (Aug 2023)
- `htdocs/data/sample_202407`
  - Pressure sample data (Jul 2024)

Sample Geotiff directories:

- `htdocs/data/sample_graphcast/pres_geotiff`
- `htdocs/data/sample_202308/pres_geotiff`
- `htdocs/data/sample_202308/rain_geotiff`
- `htdocs/data/sample_202407/pres_geotiff`

Sample glTF models:

- `htdocs/data/sample_graphcast/model_mesh.glb`
- `htdocs/data/sample_graphcast/model_pointcloud.glb`
- `htdocs/data/sample_202308/model_mesh_20230814_20230816.glb`
- `htdocs/data/sample_202407/model_mesh_20240711_20240713.glb`

## Input data requirements

Prepare one Geotiff file per timestamp.

- Extension: `.tif`
- Band count: `1`
- CRS: `WGS84` (`EPSG:4326`)
- Data type: `Float64` (recommended by current samples/workflow)

Place files under `htdocs/data/<your_dataset>/` and name them sequentially:
`1.tif`, `2.tif`, `3.tif`, ...

## Create glTF from Geotiff

If you use your own data, generate a point-cloud or mesh glTF from the first Geotiff frame.

Install Python dependencies:

```bash
pip install numpy pygltflib pymap3d open3d gdal
```

Generate models:

- Point cloud:

```bash
python src/geotiff2gltfPointCloud.py htdocs/data/<geotiff_dir>/1.tif htdocs/data/<output_name>.glb
```

- Mesh:

```bash
python src/geotiff2gltfMesh.py htdocs/data/<geotiff_dir>/1.tif htdocs/data/<output_name>.glb
```

## Configure presets (`htdocs/js/main.js`)

The app now uses `samplePresets` instead of a single hard-coded dataset.
Each preset defines:

- `label`
- `modelPath`
- `geotiffUrl`
- `startDateTime`
- `endDateTime`
- `timeStep`
- `heightBuf`
- `heightOffset`
- `zscale`
- `zmin`
- `zmax`

Minimal preset example:

```js
const samplePresets = {
  my_preset: {
    label: "My dataset",
    modelPath: "./data/my_dataset/model_mesh.glb",
    geotiffUrl: "./data/my_dataset/pres_geotiff",
    startDateTime: "2026/01/01 00:00:00",
    endDateTime: "2026/01/01 23:00:00",
    timeStep: 1,
    heightBuf: "10000.0",
    heightOffset: "10000.0",
    zscale: "1.0",
    zmin: "0.0",
    zmax: "100.0",
  },
};
```

Set default preset with `defaultSamplePresetKey`.
You can also open directly with a preset key:

```text
http://localhost/?sample=my_preset
```

Current preset keys in source:

- `graphcast_mesh_pressure`
- `graphcast_pointcloud_pressure`
- `typhoon7_pressure_202308`
- `typhoon7_rain_202308`
- `pressure_202407`

## Run

### Docker

```bash
cd docker
docker compose up -d --build
```

Open `http://localhost`.

Stop:

```bash
docker compose down
```

### Without Docker

Serve `htdocs/` with any HTTP server and open `index.html` through that server (do not use `file://`).

## Usage

1. Open the page and wait until Geotiff loading completes.
2. Animation starts automatically (loop playback).
3. Switch dataset from `Sample preset` or by `?sample=...`.
4. Adjust visual parameters in the top-left toolbar, then click `Apply`.
5. Check FPS in the top-left (Cesium debug FPS counter).

Toolbar parameters:

- Minimum: lower bound of color mapping range
- Maximum: upper bound of color mapping range
- Curvature coefficient: CS curvature emphasis
- Slope-angle coefficient: CS slope emphasis
- Color-map opacity: blend strength of the color map
- Contour interval: contour spacing (`0` disables contours)
- Model opacity: glTF model transparency
- Invert Z scale: mirrors vertical shape within the preset Z range
