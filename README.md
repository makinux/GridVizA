# 3D Animation of Time-Series Data

This is an application that visualizes time-series data by animating it on the Cesium 3D globe.

See the instructions below for operation.

## Prerequisites

Prepare the data and settings. The repository includes the following two prepared sample datasets:

- `htdocs/data/sample_graphcast`: Global December 2023 time-series pressure data predicted by the weather forecast AI model [GraphCast](https://deepmind.google/discover/blog/graphcast-ai-model-for-faster-and-more-accurate-global-weather-forecasting/)
- `htdocs/data/sample_202308`: Time-series pressure and rainfall data for Typhoon 7 in August 2023 (source: [Meteorological Agency data published in the Kyoto University Biosphere Database](https://database.rish.kyoto-u.ac.jp/arch/jmadata/gpv-netcdf.html))

### Time-series Geotiff data

Prepare Geotiff files for the time-series data you want to animate.

Expected Geotiff format:

- Extension: `.tif`
- Band count: `1`
- Spatial reference system: `WGS84` (`EPSG:4326`)
- Data type: 64-bit floating point (`Float64`)

Place Geotiff files for each time point in a directory and set them under `htdocs/data/`.
Name files using sequential numbers starting from `1` (example: `1.tif`, `2.tif`, `3.tif`, ... `40.tif`).

Sample Geotiff time-series are stored in:

- `htdocs/data/sample_graphcast/pres_geotiff` (pressure data)
- `htdocs/data/sample_202308/pres_geotiff` (pressure data)
- `htdocs/data/sample_202308/rain_geotiff` (rainfall data)

### Create glTF model

Create point-cloud or mesh glTF models to render and animate in Cesium.

If you use custom time-series Geotiff data, use the Python scripts in the `src` directory to generate a glTF model from Geotiff.

Install required libraries in a Python environment:

```bash
pip install numpy pyproj pygltflib open3d
```

Generate the glTF model with:

- Point-cloud model

  ```bash
  python src/geotiff2gltfPointCloud.py htdocs/data/{Geotiff directory}/1.tif htdocs/data/{output glTF model name}.glb
  ```

- Mesh model

  ```bash
  python src/geotiff2gltfMesh.py htdocs/data/{Geotiff directory}/1.tif htdocs/data/{output glTF model name}.glb
  ```

Place generated glTF models in `htdocs/data/`.

Included sample models:

- `htdocs/data/sample_graphcast/model_pointcloud.glb` (point-cloud model)
- `htdocs/data/sample_graphcast/model_mesh.glb` (mesh model)
- `htdocs/data/sample_202308/model_mesh_20230814_20230816.glb` (mesh model)

### Configuration

Set configuration items in `htdocs/js/main.js`.

```js
// ---------- Preset settings (Global pressure data predicted by GraphCast for Dec 2023) ---------------------------

const modelPath = "./data/sample_graphcast/model_mesh.glb"; // glTF model path

const geotiffUrl = "./data/sample_graphcast/pres_geotiff"; // Geotiff data source directory (${geotiffUrl}/1.tif, ${geotiffUrl}/2.tif, ...)
const startDateTime = Date.parse("2023/12/07 06:00:00"); // Animation start datetime
const endDateTime = Date.parse("2023/12/17 03:00:00"); // Animation end datetime
const timeStep = 6; // Time step in hours

const heightBuf = "10000.0"; // Height scale
const heightOffset = "10000.0"; // Height offset

const zscale = "1.0"; // Data value scale
const zmin = "947.253515625"; // Minimum data value (after z-scale is applied)
const zmax = "1058.2825"; // Maximum data value (after z-scale is applied)
```

This repository includes sample settings in `htdocs/js/main.js`; use those when running sample data.

## Running instructions

1. Place the `htdocs` directory on a web server. If Docker is available, run `docker compose up` in the `docker` directory to launch a server.

2. Open your web server URL and load the app page. For Docker, open `http://localhost`.

3. Time-series data loading starts automatically when the page opens; wait until loading finishes to see the point-cloud or mesh glTF model.

4. Press play on the bottom time-series slider to start animation.

5. You can adjust display settings from the settings UI in the top-left corner. Enter values and click `Apply` to reflect the settings.

   Settings:

   - Minimum value: minimum value of the time-series data; controls color map range.
   - Maximum value: maximum value of the time-series data; controls color map range.
   - Curvature coefficient: coefficient for CS terrain curvature calculation; higher values emphasize the CS terrain shape.
   - Slope-angle coefficient: coefficient for CS terrain slope-angle calculation; higher values emphasize the CS terrain shape.
   - Color-map opacity: opacity of the color map.
   - Contour interval: interval between contour lines; `0` hides contour lines.
   - Model opacity: opacity of the glTF model.
